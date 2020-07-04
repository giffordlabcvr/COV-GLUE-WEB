covApp.controller('covReplacementsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'glueWebToolConfig', 'dialogs', 'pagingContext', '$analytics', 'saveFile', 'FileSaver',
		  function($scope, $route, $routeParams, glueWS, glueWebToolConfig, dialogs, pagingContext, $analytics, saveFile, FileSaver) {

			addUtilsToScope($scope);

			$scope.replacements = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"
			$scope.analytics = $analytics;
			
			$scope.updateCount = function(pContext) {
				console.log("updateCount", pContext);
				var cmdParams = {
						"tableName": "cov_replacement",
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
			    .error(glueWS.raiseErrorDialog(dialogs, "counting replacements"));
			}
			
			$scope.updatePage = function(pContext) {
				console.log("updatePage", pContext);
				var cmdParams = {
						"tableName": "cov_replacement",
						"allObjects": false,
			            "whereClause":$scope.whereClause,
			            "rendererModuleName": "covListReplacementsRenderer"
				};
				pContext.extendListCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
			    	"multi-render": cmdParams 
				})
				.success(function(data, status, headers, config) {
					$scope.replacements = data.multiRenderResult.resultDocument;
					console.info('$scope.replacements', $scope.replacements);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving replacements"));
			}
			
			$scope.pagingContext = pagingContext.createPagingContext($scope.updateCount, $scope.updatePage);

			$scope.pagingContext.setDefaultSortOrder([
	            { property:"num_seqs", displayName: "Containing sequences", order: "-" },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region", order: "+"  },
  	            { property:"codon_label_int", displayName: "Codon number", order: "+"  },
  	            { property:"replacement_aa", displayName: "Replacement amino acid", order: "+"  },
			]);

  			$scope.pagingContext.setSortableProperties([
  	            { property:"num_seqs", displayName: "Containing sequences" },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region" },
  	            { property:"codon_label_int", displayName: "Codon number" },
  	            { property:"replacement_aa", displayName: "Replacement amino acid" },
  	            { property:"grantham_distance_double", displayName: "Grantham distance" },
  	            { property:"miyata_distance", displayName: "Miyata distance" },
              ]);

			$scope.pagingContext.setFilterProperties([
  	            { property:"num_seqs", displayName: "Containing sequences", filterHints: {type: "Integer"}  },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region", altProperties:["variation.featureLoc.feature.displayName"], filterHints: {type: "String"}  },
  	            { property:"codon_label_int", displayName: "Codon number", filterHints: {type: "Integer"}  },
  	            { property:"reference_aa", displayName: "Reference amino acid", filterHints: {type: "String"}  },
  	            { property:"replacement_aa", displayName: "Replacement amino acid", filterHints: {type: "String"}  },
  	            { property:"grantham_distance_int", displayName: "Grantham distance", filterHints: {type: "Integer"}  },
  	            { property:"miyata_distance", displayName: "Miyata distance", filterHints: {type: "Double"}  },
	            { property:"radical_hanada_category_i", displayName: "Radical (Polarity & Volume)?", filterHints: {type: "Boolean"}  },
	            { property:"radical_hanada_category_ii", displayName: "Radical (Charge & Aromaticity)?", filterHints: {type: "Boolean"}  },
	            { property:"radical_hanada_category_iii", displayName: "Radical (Charge & Polarity)?", filterHints: {type: "Boolean"}  },
	        ]);
			                          			                          			
  			$scope.pagingContext.setDefaultFilterElems([]);
  			$scope.pagingContext.countChanged();

  			
			$scope.downloadReplacements = function(downloadFormat) {
				console.log("Downloading isolate metadata");
				
				var suffix = "csv";
				if(downloadFormat == "TAB") {
					suffix = "tsv";
				}
				
				saveFile.saveAsDialog("Replacements data file", 
						"replacements."+suffix, function(fileName) {
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

					$scope.analytics.eventTrack("replacementsDownload", 
							{   category: 'dataDownload', 
						label: 'totalItems:'+$scope.pagingContext.getTotalItems() });

					glueWS.runGlueCommandLong("module/covReplacementWebExporter", {
						"invoke-function": {
							"functionName" : "exportReplacements", 
							"argument": [
								downloadFormat,
								cmdParams.whereClause,
								cmdParams.sortProperties,
								fileName,
								cmdParams.lineFeedStyle
							]
						},
					},
					"Replacements file preparation in progress")
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
					.error(glueWS.raiseErrorDialog(dialogs, "preparing replacements file"));
				});
			}

  			
		}]);
