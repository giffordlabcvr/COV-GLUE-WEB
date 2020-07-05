covApp.controller('covVariationCtrl', 
		[ '$scope', 'glueWS', 'dialogs', 'glueWebToolConfig', 'filterUtils', '$analytics', 'saveFile', 'FileSaver',
    function($scope, glueWS, dialogs, glueWebToolConfig, filterUtils, $analytics, saveFile, FileSaver) {


			addUtilsToScope($scope);
			
			$scope.displayLineage = function(seq) {
				if(seq.cov_glue_lineage == null && seq.gisaid_lineage == null) {
					return "-";
				}
				if(seq.cov_glue_lineage != null && seq.gisaid_lineage == null) {
					return seq.cov_glue_lineage;
				}
				if(seq.cov_glue_lineage == null && seq.gisaid_lineage != null) {
					return seq.gisaid_lineage;
				}
				if(seq.cov_glue_lineage == seq.gisaid_lineage) {
					return seq.cov_glue_lineage;
				}
				return seq.cov_glue_lineage + " or " + seq.gisaid_lineage;
			}
			
			$scope.globalRegionFilterM49 = function() {
				// note property here is a dummy value.
                return { property:"globalRegion", nullProperty:"m49_country", displayName: "Global Region", filterHints: 
	            	{ type: "StringFromFixedValueSet",
                	  generateCustomDefault: function() {
	            		  return {
	            			  fixedValue: $scope.globalRegionFixedValueSetM49[0]
	            		  };
	            	  },
                	  generatePredicateFromCustom: function(filterElem) {
                		  var custom = filterElem.custom;
                		  var fakeFilterElem = {
                		    property:custom.fixedValue.property,
                		    nullProperty:filterElem.nullProperty,
                			type: "String",
                			predicate: {
                				operator: filterElem.predicate.operator,
                				operand: [custom.fixedValue.value]
                			}
                		  };
                		  var cayennePredicate = filterUtils.filterElemToCayennePredicate(fakeFilterElem);
                		  // we want notmatches here to allow sequences with countries that have a null region/subregion/intregion.
                		  if(filterElem.predicate.operator == 'notmatches') {
                			  cayennePredicate = "( ( "+custom.fixedValue.property + " = null ) or ( " + cayennePredicate + " ) )";
                		  }
                		  return cayennePredicate;
                  	  },
	            	  generateFixedValueSet: function() {
	            		  return $scope.globalRegionFixedValueSetM49;
	            	  }
	            	}
                };
			};
			$scope.initGlobalRegionFixedValueSetM49 = function () {
				$scope.globalRegionFixedValueSetM49 = [];

				glueWS.runGlueCommand("", {
				    "multi-render":{
				        "tableName":"m49_region",
				        "allObjects":"true",
				        "rendererModuleName":"m49RegionTreeRenderer"
				    }
				})
				.success(function(data, status, headers, config) {
					var multiRenderResult = data.multiRenderResult;
					console.info('m49 region multi-render result', data.multiRenderResult);
					$scope.globalRegionFixedValueSetM49 = [];
					for(var i = 0; i < multiRenderResult.resultDocument.length; i++) {
						var m49Region = multiRenderResult.resultDocument[i].m49Region;
						$scope.globalRegionFixedValueSetM49.push({
							property:"m49_country.m49_region",
				   			  value:m49Region.id,
				   			  indent:0,
				   			  displayName:m49Region.displayName
						});
						if(m49Region.m49SubRegion != null) {
							for(var j = 0; j < m49Region.m49SubRegion.length; j++) {
								var m49SubRegion = m49Region.m49SubRegion[j];
								$scope.globalRegionFixedValueSetM49.push({
									property:"m49_country.m49_sub_region",
						   			  value:m49SubRegion.id,
						   			  indent:1,
						   			  displayName:m49SubRegion.displayName
								});
								if(m49SubRegion.m49IntermediateRegion != null) {
									for(var k = 0; k < m49SubRegion.m49IntermediateRegion.length; k++) {
										var m49IntermediateRegion = m49SubRegion.m49IntermediateRegion[k];
										$scope.globalRegionFixedValueSetM49.push({
											property:"m49_country.m49_intermediate_region",
								   			  value:m49IntermediateRegion.id,
								   			  indent:2,
								   			  displayName:m49IntermediateRegion.displayName
										});
									}
								}
							}
						}
					}
					console.info('$scope.globalRegionFixedValueSetM49', $scope.globalRegionFixedValueSetM49);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving M49 region tree"));
			};

			$scope.downloadSequenceMetadata = function(downloadFormat) {
				console.log("Downloading sequence metadata");
				
				var suffix = "csv";
				if(downloadFormat == "TAB") {
					suffix = "tsv";
				}
				
				saveFile.saveAsDialog("sequence metadata file", 
						"sequenceMetadata."+suffix, function(fileName) {
					var cmdParams = {
							"lineFeedStyle": "LF"
					};
					if($scope.seqWhereClause) {
						cmdParams.whereClause = $scope.seqWhereClause;
					}
					$scope.seqPagingContext.extendCmdParamsWhereClause(cmdParams);
					$scope.seqPagingContext.extendCmdParamsSortOrder(cmdParams);

					if(userAgent.os.family.indexOf("Windows") !== -1) {
						cmdParams["lineFeedStyle"] = "CRLF";
					}

					$scope.analytics.eventTrack("sequenceMetadataDownload", 
							{   category: 'dataDownload', 
						label: 'totalItems:'+$scope.seqPagingContext.getTotalItems() });

					glueWS.runGlueCommandLong("module/covSequenceMetadataWebExporter", {
						"invoke-function": {
							"functionName" : "exportSequenceMetadata", 
							"argument": [
								downloadFormat,
								cmdParams.whereClause,
								cmdParams.sortProperties,
								fileName,
								cmdParams.lineFeedStyle
							]
						},
					},
					"Sequence metadata file preparation in progress")
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
					.error(glueWS.raiseErrorDialog(dialogs, "preparing sequence metadata file"));
				});
			}


}]);
