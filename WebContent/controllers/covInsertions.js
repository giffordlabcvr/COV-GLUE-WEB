covApp.controller('covInsertionsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'glueWebToolConfig', 'dialogs', 'pagingContext', '$analytics', 'saveFile', 'FileSaver',
			  function($scope, $route, $routeParams, glueWS, glueWebToolConfig, dialogs, pagingContext, $analytics, saveFile, FileSaver) {

			addUtilsToScope($scope);

			$scope.insertions = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"

			$scope.analytics = $analytics;

			$scope.updateCount = function(pContext) {
				console.log("updateCount", pContext);
				var cmdParams = {
						"tableName": "cov_nt_insertion",
						"whereClause": $scope.whereClause
				};
				pContext.extendCountCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
					"count":{
						"custom-table-row":cmdParams
					}
				}
				)
			    .success(function(data, status, headers, config) {
					console.info('count raw result', data);
					pContext.setTotalItems(data.countResult.count);
					pContext.firstPage();
			    })
			    .error(glueWS.raiseErrorDialog(dialogs, "counting insertions"));
			}
			
			$scope.updatePage = function(pContext) {
				console.log("updatePage", pContext);
				var cmdParams = {
						"tableName": "cov_nt_insertion",
						"allObjects": false,
			            "whereClause":$scope.whereClause,
			            "rendererModuleName": "covListInsertionsRenderer"
				};
				pContext.extendListCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
			    	"multi-render": cmdParams 
				})
				.success(function(data, status, headers, config) {
					$scope.insertions = data.multiRenderResult.resultDocument;
					console.info('$scope.insertions', $scope.insertions);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving insertions"));
			}
			
			$scope.pagingContext = pagingContext.createPagingContext($scope.updateCount, $scope.updatePage);

			$scope.pagingContext.setDefaultSortOrder([
	            { property:"num_seqs", displayName: "Containing sequences", order: "-" },
  	            { property:"last_ref_nt_before", displayName: "Genome start point", order: "+"  }
			]);

  			$scope.pagingContext.setSortableProperties([
  	            { property:"num_seqs", displayName: "Containing sequences" },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region" },
  	            { property:"last_ref_nt_before", displayName: "Genome start point" }
              ]);

			$scope.pagingContext.setFilterProperties([
  	            { property:"num_seqs", displayName: "Containing sequences", filterHints: {type: "Integer"}  },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region", altProperties:["variation.featureLoc.feature.displayName"], filterHints: {type: "String"}  },
  	            { property:"last_codon_before_int", displayName: "Last codon before number", filterHints: {type: "Integer"}  },
  	            { property:"first_codon_after_int", displayName: "First codon after number", filterHints: {type: "Integer"}  }
	        ]);
			                          			                          			
  			$scope.pagingContext.setDefaultFilterElems([]);
  			$scope.pagingContext.countChanged();

			$scope.downloadInsertions = function(downloadFormat) {
				console.log("Downloading isolate metadata");
				
				var suffix = "csv";
				if(downloadFormat == "TAB") {
					suffix = "tsv";
				}
				
				saveFile.saveAsDialog("Insertions data file", 
						"insertions."+suffix, function(fileName) {
					var cmdParams = {
							"lineFeedStyle": "LF"
					};
					if($scope.whereClause) {
						cmdParams.whereClause = $scope.whereClause;
					}
					$scope.pagingContext.extendCmdParamsWhereClause(cmdParams);
					$scope.pagingContext.extendCmdParamsSortOrder(cmdParams);

					if(userAgent.os.family.indexOf("Windows") !== -1) {
						cmdParams["lineFeedStyle"] = "CRLF";
					}

					$scope.analytics.eventTrack("insertionsDownload", 
							{   category: 'dataDownload', 
						label: 'totalItems:'+$scope.pagingContext.getTotalItems() });

					glueWS.runGlueCommandLong("module/covInsertionWebExporter", {
						"invoke-function": {
							"functionName" : "exportInsertions", 
							"argument": [
								downloadFormat,
								cmdParams.whereClause,
								cmdParams.sortProperties,
								fileName,
								cmdParams.lineFeedStyle
							]
						},
					},
					"Insertions file preparation in progress")
					.success(function(data, status, headers, config) {
						var result = data.tabularWebFileResult;
						var dlg = dialogs.create(
								glueWebToolConfig.getProjectBrowserURL()+'/dialogs/fileReady.html','fileReadyCtrl',
								{ 
									url:"gluetools-ws/glue_web_files/"+result.webSubDirUuid+"/"+result.webFileName, 
									fileName: result.webFileName,
									fileSize: result.webFileSizeString
								}, {});
					})
					.error(glueWS.raiseErrorDialog(dialogs, "preparing insertions file"));
				});
			}


  			
  			
		}]);
