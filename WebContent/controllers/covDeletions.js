covApp.controller('covDeletionsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'glueWebToolConfig', 'dialogs', 'pagingContext', '$analytics', 'saveFile', 'FileSaver',
			  function($scope, $route, $routeParams, glueWS, glueWebToolConfig, dialogs, pagingContext, $analytics, saveFile, FileSaver) {

			addUtilsToScope($scope);

			$scope.deletions = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"

			$scope.analytics = $analytics;

			$scope.updateCount = function(pContext) {
				console.log("updateCount", pContext);
				var cmdParams = {
						"tableName": "cov_nt_deletion",
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
			    .error(glueWS.raiseErrorDialog(dialogs, "counting deletions"));
			}
			
			$scope.updatePage = function(pContext) {
				console.log("updatePage", pContext);
				var cmdParams = {
						"tableName": "cov_nt_deletion",
						"allObjects": false,
			            "whereClause":$scope.whereClause,
			            "rendererModuleName": "covListDeletionsRenderer"
				};
				pContext.extendListCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
			    	"multi-render": cmdParams 
				})
				.success(function(data, status, headers, config) {
					$scope.deletions = data.multiRenderResult.resultDocument;
					console.info('$scope.deletions', $scope.deletions);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving deletions"));
			}
			
			$scope.pagingContext = pagingContext.createPagingContext($scope.updateCount, $scope.updatePage);

			$scope.pagingContext.setDefaultSortOrder([
	            { property:"num_seqs", displayName: "Containing sequences", order: "-" },
  	            { property:"reference_nt_start", displayName: "Genome start point", order: "+"  }
			]);

  			$scope.pagingContext.setSortableProperties([
  	            { property:"num_seqs", displayName: "Containing sequences" },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region" },
  	            { property:"reference_nt_start", displayName: "Genome start point" }
              ]);

			$scope.pagingContext.setFilterProperties([
  	            { property:"num_seqs", displayName: "Containing sequences", filterHints: {type: "Integer"}  },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region", altProperties:["variation.featureLoc.feature.displayName"], filterHints: {type: "String"}  },
  	            { property:"start_codon_int", displayName: "Start codon number", filterHints: {type: "Integer"}  },
  	            { property:"end_codon_int", displayName: "End codon number", filterHints: {type: "Integer"}  }
	        ]);
			                          			                          			
  			$scope.pagingContext.setDefaultFilterElems([]);
  			$scope.pagingContext.countChanged();

			$scope.downloadDeletions = function(downloadFormat) {
				console.log("Downloading deletions");
				
				var suffix = "csv";
				if(downloadFormat == "TAB") {
					suffix = "tsv";
				}
				
				saveFile.saveAsDialog("deletions data file", 
						"deletions."+suffix, function(fileName) {
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

					$scope.analytics.eventTrack("deletionsDownload", 
							{   category: 'dataDownload', 
						label: 'totalItems:'+$scope.pagingContext.getTotalItems() });

					glueWS.runGlueCommandLong("module/covDeletionWebExporter", {
						"invoke-function": {
							"functionName" : "exportDeletions", 
							"argument": [
								downloadFormat,
								cmdParams.whereClause,
								cmdParams.sortProperties,
								fileName,
								cmdParams.lineFeedStyle
							]
						},
					},
					"Deletions file preparation in progress")
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
					.error(glueWS.raiseErrorDialog(dialogs, "preparing deletions file"));
				});
			}

  			
  			
		}]);
