covApp.controller('covFastaAnalysisCtrl', 
		[ '$scope', '$controller', 'glueWS', 'glueWebToolConfig', 'dialogs', '$analytics', 'saveFile', 'FileSaver', '$http', '$window', '$timeout',
			  function($scope, $controller, glueWS, glueWebToolConfig, dialogs, $analytics, saveFile, FileSaver, $http, $window, $timeout) {
				
				addUtilsToScope($scope);

				$scope.responseID = 1;
				$scope.analytics = $analytics;
				$scope.featureVisualisationUpdating = false;
				$scope.phyloVisualisationUpdating = false;
				$scope.phyloLegendUpdating = false;
				$scope.featureSvgUrlCache = {};
				$scope.phyloSvgResultObjectCache = {};
				$scope.featureNameToScrollLeft = {};
				$scope.lastFeatureName = null;
		    	$scope.displaySection = 'summary';
				
				$controller('fileConsumerCtrl', { $scope: $scope, 
					glueWebToolConfig: glueWebToolConfig, 
					glueWS: glueWS, 
					dialogs: dialogs});

				$scope.availableTipAnnotations = [
					{
						name: "isolatePlusLineage",
						displayName: "Virus name & lineage"
					},
					{
						name: "lineage",
						displayName: "Lineage"
					},
					{
						name: "isolate",
						displayName: "Virus name"
					},
					{
						name: "gisaidId",
						displayName: "GISAID ID"
					},
					{
						name: "country",
						displayName: "Country"
					},
					{
						name: "location",
						displayName: "Location"
					},
					{
						name: "collectionDate",
						displayName: "Collection date"
					},
				];
				
				$scope.tipAnnotation = $scope.availableTipAnnotations[0];
				
				glueWS.runGlueCommand("custom-table-row/cov_project_properties/gisaidTimeStamp", {
				    "show":{
				        "property":{
				            "property":"value"
				        }
				    }
				})
				.success(function(data, status, headers, config) {
					$scope.gisaidTimeStamp = data.propertyValueResult.value;
					console.info('$scope.gisaidTimeStamp', $scope.gisaidTimeStamp);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving available features"));
				
				
				glueWS.runGlueCommand("", {
				    "list":{
				        "feature":{
				            "whereClause":"featureMetatags.name = 'CODES_AMINO_ACIDS' and featureMetatags.value = true",
				            "fieldName":[
				                "name",
				                "displayName",
				                "max_codon_number",
				                "description"
				            ]
				        }
				    }
				})
				.success(function(data, status, headers, config) {
					$scope.availableFeatures = tableResultAsObjectList(data);
					_.each($scope.availableFeatures, function(feature) {
						feature.aaCodonLabel = 1;
						feature.aaDeletionStart = 1;
						feature.aaDeletionEnd = 1;
						feature.aaInsertionStart = 1;
						feature.aaInsertionAAs = "M";
						feature.varType = "aminoAcid";
					});
					$scope.aaFeature = _.find($scope.availableFeatures, function(feature) { return feature.name == "NSP1"; });
					console.info('$scope.availableFeatures', $scope.availableFeatures);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving available features"));

				glueWS.runGlueCommand("", {
				    "list":{
				        "feature":{
				            "whereClause":"featureMetatags.name = 'CODES_AMINO_ACIDS' and featureMetatags.value = true and (name != 'ORF_1ab') and (name != 'ORF_1a')",
				            "fieldName":[
				                "name",
				                "displayName",
				                "description"
				            ]
				        }
				    }
				})
				.success(function(data, status, headers, config) {
					$scope.coverageFeatures = tableResultAsObjectList(data);
					console.info('$scope.coverageFeatures', $scope.coverageFeatures);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving coverage features"));

				
				
				// executed after the project URL is set
				glueWS.addProjectUrlListener( {
					reportProjectURL: function(projectURL) {
					    $scope.uploader.url = projectURL + "/module/covReportingController";
					    console.info('uploader.url', $scope.uploader.url);
					}
				});
				
				$scope.$watch('displaySection', function(newObj, oldObj) {
					if(newObj == "genomeVisualisation" && !$scope.fileItemUnderAnalysis.clickedGenomeVis) {
						$scope.fileItemUnderAnalysis.clickedGenomeVis = true;
						$scope.updateFeatureSvg(); 
					} else if(newObj == "phyloPlacement" && !$scope.fileItemUnderAnalysis.clickedPhyloPlacement) {
						$scope.fileItemUnderAnalysis.clickedPhyloPlacement = true;
						$scope.updatePhyloSvg(); 
					} 
				});

				
			    // CALLBACKS
			    $scope.uploader.onBeforeUploadItem = function(item) {
					var commandObject = {
							"invoke-consumes-binary-function" : {
								"functionName": "reportFastaWeb",
								"argument": [item.file.name]
							}
					};
			    	item.formData = [{command: JSON.stringify(commandObject)}];
			    	item.headers = {"glue-async": "true"};
			    	item.requestStatus = { "code": "UPLOADING" };
			    	item.response = null;
			    	item.commandError = null;
			        console.info('formData', JSON.stringify(item.formData));
			        console.info('onBeforeUploadItem', item);
					$scope.analytics.eventTrack("submitFastaFile", 
							{   category: 'covFastaAnalysis', 
								label: 'fileName:'+item.file.name+',fileSize:'+item.file.size});


			    };
			    $scope.uploader.onSuccessItem = function(fileItem, response, status, headers) {
			        console.info('onSuccessItem', fileItem, response, status, headers);
					$scope.analytics.eventTrack("covFastaAnalysisResult", 
							{  category: 'covFastaAnalysis', 
								label: 'fileName:'+fileItem.file.name+',fileSize:'+fileItem.file.size });
					fileItem.requestStatus = response;
					console.log("covFastaAnalysis.requestStatus initial", response);
					$timeout(function() {
						$scope.updateRequest(fileItem);
					}, 3000);
				};
				
			    $scope.uploader.onErrorItem = function(fileItem, response, status, headers) {
			        console.info('onErrorItem', fileItem, response, status, headers);
			    	fileItem.requestStatus = { "code": "COMPLETE" };
					fileItem.commandError = {data: response, status:status, headers:headers, config:response.config} ;
			    };

				$scope.removeAll = function() {
					$scope.uploader.clearQueue();
					$scope.fileItemUnderAnalysis = null;
				}

				$scope.removeItem = function(item) {
					if($scope.fileItemUnderAnalysis == item) {
						$scope.fileItemUnderAnalysis = null;
					}
					item.remove();
				}
				
				$scope.updateRequest = function(fileItem) {
					var requestID = fileItem.requestStatus.requestID;
					glueWS.getGlueRequestStatus(requestID).then(function onSuccess(response) {
						console.log("covFastaAnalysis.requestStatus polled", response.data);
						fileItem.requestStatus = response.data;
						if(fileItem.requestStatus.code == "COMPLETE" && fileItem.response == null && fileItem.commandError == null) {
							glueWS.collectGlueRequestResult(requestID).then(function onSuccess(response) {
								console.log("covFastaAnalysis.requestStatus.response async", response.data);
								fileItem.response = response.data;
								fileItem.response.responseID = $scope.responseID;
								$scope.responseID++;
							}, function onError(response) {
								fileItem.commandError = response;
							});
						} else if (fileItem.requestStatus.code == "QUEUED" || fileItem.requestStatus.code == "RUNNING") { 
							$timeout(function() {
								$scope.updateRequest(fileItem);
							}, 3000);
						}
					}, function onError(response) {
						fileItem.requestStatus = { code: "COMPLETE" };
						fileItem.commandError = response;
					});
				};
				
				
			    $scope.showAnalysisResults = function(item) {
			    	$scope.setFileItemUnderAnalysis(item);
			    };
				
			    $scope.showError = function(item) {
					var dlgFunction = glueWS.raiseErrorDialog(dialogs, "executing command");
					dlgFunction(item.commandError.data, item.commandError.status, item.commandError.headers, item.commandError.config);
			    };
			    
			    $scope.setFileItemUnderAnalysis = function(item) {
					$scope.saveFeatureScrollLeft();
			    	if(item.sequenceReport == null) {
			    		$scope.setSequenceReport(item, item.response.covWebReport.results[0]);
			    	}
			    	$scope.fileItemUnderAnalysis = item;
			    	$scope.featureVisualisationSvgUrl = null;
			    	$scope.phyloVisualisationSvgResultObject = null;
			    	$scope.phyloVisualisationSvgUrl = null;
			    	$scope.phyloLegendSvgUrl = null;
			    }
			    
			    $scope.setSequenceReport = function(item, sequenceReport) {
			    	// e.g. null genotype
			    	if(sequenceReport.covReport.sequenceResult.visualisationHints == null) {
			    		$scope.setComparisonRef(sequenceReport, null);
			    		$scope.setFeature(sequenceReport, null);
			    	} else {
				    	if(sequenceReport.covReport.comparisonRef == null) {
				    		$scope.setComparisonRef(sequenceReport, sequenceReport.covReport.sequenceResult.visualisationHints.comparisonRefs[0]);
				    	}
			    		var availableFeatures = sequenceReport.covReport.sequenceResult.visualisationHints.features;
			    		var feature = sequenceReport.covReport.feature;
				    	if(feature == null) {
							feature = _.find(availableFeatures, function(feature) { return feature.name == "NSP1"; });
				    	}
			    		if($scope.lastFeatureName != null) {
			    			var equivalentFeature = _.find(availableFeatures, function(availableFeature) { return availableFeature.name == $scope.lastFeatureName; });
			    			if(equivalentFeature != null) {
			    				feature = equivalentFeature;
			    			}
			    		}
			    		$scope.setFeature(sequenceReport, feature);
			    	}
			    	if(sequenceReport.covReport.sequenceResult.placements == null) {
			    		$scope.setPlacement(sequenceReport, null);
			    	} else {
			    		if(sequenceReport.covReport.placement == null) {
				    		$scope.setPlacement(sequenceReport, sequenceReport.covReport.sequenceResult.placements[0]);
			    		}
			    	}

			    	item.sequenceReport = sequenceReport;
			    }

			    $scope.setTipAnnotation = function(tipAnnotation) {
			    	$scope.tipAnnotation = tipAnnotation;
			    }

			    $scope.setAAFeature = function(feature) {
			    	$scope.aaFeature = feature;
			    }

			    $scope.setComparisonRef = function(sequenceReport, comparisonRef) {
			    	// need to nest comparisonRef within covReport to avoid breaking command doc assumptions.
			    	sequenceReport.covReport.comparisonRef = comparisonRef;
			    }

			    $scope.setFeature = function(sequenceReport, feature) {
			    	// need to nest feature within covReport to avoid breaking command doc assumptions.
			    	sequenceReport.covReport.feature = feature;
			    }

			    $scope.setVarType = function(varType) {
			    	$scope.aaFeature.varType = varType;
			    }

			    $scope.setPlacement = function(sequenceReport, placement) {
			    	// need to nest feature within covReport to avoid breaking command doc assumptions.
			    	sequenceReport.covReport.placement = placement;
			    }

			    
				$scope.featureSvgUpdated = function() {
					console.info('featureSvgUpdated');
					var featureVisualisationSvgElem = document.getElementById('featureVisualisationSvg');
					if(featureVisualisationSvgElem != null) {
						var featureName = $scope.fileItemUnderAnalysis.sequenceReport.covReport.feature.name;
						console.info('featureName', featureName);
						var featureScrollLeft = $scope.featureNameToScrollLeft[featureName];
						console.info('featureScrollLeft', featureScrollLeft);
						if(featureScrollLeft != null) {
							featureVisualisationSvgElem.scrollLeft = featureScrollLeft;
						} else {
							featureVisualisationSvgElem.scrollLeft = 0;
						}
						$scope.lastFeatureName = featureName;
					} 
					$scope.featureVisualisationUpdating = false;
					
				}
				
				$scope.phyloSvgUpdated = function() {
					$scope.phyloVisualisationUpdating = false;
				}
				
				$scope.phyloLegendSvgUpdated = function() {
					$scope.phyloLegendUpdating = false;
				}
				
				$scope.updateFeatureSvgFromUrl = function(cacheKey, svgUrl) {
					if(svgUrl == $scope.featureVisualisationSvgUrl) {
						// onLoad does not get invoked again for the same URL.
						$scope.featureSvgUpdated();
					} else {
						$scope.featureVisualisationSvgUrl = svgUrl;
						$scope.featureSvgUrlCache[cacheKey] = svgUrl;
					}
				}
				
				$scope.updatePhyloSvgFromResultObject = function(cacheKey, svgResultObject) {
					if(_.isEqual(svgResultObject, $scope.phyloVisualisationSvgResultObject)) {
						// onLoad does not get invoked again for the same URLs.
						$scope.phyloSvgUpdated();
						$scope.phyloLegendSvgUpdated();
					} else {
						$scope.phyloSvgResultObjectCache[cacheKey] = svgResultObject;
						$scope.phyloVisualisationSvgResultObject = svgResultObject;
						$scope.phyloVisualisationSvgUrl = "/glue_web_files/"+
						svgResultObject.treeTransformResult.freemarkerDocTransformerWebResult.webSubDirUuid+"/"+
						svgResultObject.treeTransformResult.freemarkerDocTransformerWebResult.webFileName;
						$scope.phyloLegendSvgUrl = "/glue_web_files/"+
						svgResultObject.legendTransformResult.freemarkerDocTransformerWebResult.webSubDirUuid+"/"+
						svgResultObject.legendTransformResult.freemarkerDocTransformerWebResult.webFileName;
					}
				}
				
				$scope.saveFeatureScrollLeft = function() {
					if($scope.lastFeatureName != null) {
						var featureVisualisationSvgElem = document.getElementById('featureVisualisationSvg');
						if(featureVisualisationSvgElem != null) {
							$scope.featureNameToScrollLeft[$scope.lastFeatureName]	= featureVisualisationSvgElem.scrollLeft;
						}
					}

				}
				
				$scope.updateFeatureSvg = function() {
					
					$scope.featureVisualisationUpdating = true;
					var sequenceReport = $scope.fileItemUnderAnalysis.sequenceReport;
					var visualisationHints = sequenceReport.covReport.sequenceResult.visualisationHints;

					var cacheKey = $scope.fileItemUnderAnalysis.response.responseID+":"+
						sequenceReport.covReport.sequenceResult.id+":"+
						sequenceReport.covReport.comparisonRef.refName+":"+
						sequenceReport.covReport.feature.name;
					console.info('cacheKey', cacheKey);
					
					$scope.saveFeatureScrollLeft();
					
					var featureName = sequenceReport.covReport.feature.name;

			    	$scope.lastFeatureName = featureName;

					var cachedSvgUrl = $scope.featureSvgUrlCache[cacheKey];
					
					if(cachedSvgUrl != null) {
						$timeout(function() {
							$scope.updateFeatureSvgFromUrl(cacheKey, cachedSvgUrl);
						});
					} else {
						console.info('visualisationHints', visualisationHints);
						glueWS.runGlueCommand("module/covVisualisationUtility", 
								{ "visualise-feature": {
								    "targetReferenceName": visualisationHints.targetReferenceName,
								    "comparisonReferenceName": sequenceReport.covReport.comparisonRef.refName,
								    "featureName": featureName,
								    "queryNucleotides": visualisationHints.queryNucleotides,
								    "queryToTargetRefSegments": visualisationHints.queryToTargetRefSegments,
								    "queryDetails": visualisationHints.queryDetails
								  } }
						).then(function onSuccess(response) {
							    // Handle success
							    var data = response.data;
								console.info('visualise-feature result', data);
								var featureVisualisation = data;
								var fileName = "visualisation.svg";
								glueWS.runGlueCommand("module/covFeatureToSvgTransformer", {
									"transform-to-web-file": {
										"webFileType": "WEB_PAGE",
										"commandDocument":{
											transformerInput: {
												featureVisualisation: featureVisualisation.featureVisualisation,
												ntWidth: 16
											}
										},
										"outputFile": fileName
									}
								}).then(function onSuccess(response) {
								    var data = response.data;
									console.info('transform-to-web-file result', data);
									var transformerResult = data.freemarkerDocTransformerWebResult;
									$scope.updateFeatureSvgFromUrl(cacheKey, "/glue_web_files/"+transformerResult.webSubDirUuid+"/"+transformerResult.webFileName);
								}, function onError(response) {
									$scope.featureVisualisationUpdating = false;
									var dlgFunction = glueWS.raiseErrorDialog(dialogs, "rendering genome feature to SVG");
									dlgFunction(response.data, response.status, response.headers, response.config);
								});
						}, function onError(response) {
							    // Handle error
								$scope.featureVisualisationUpdating = false;
								var dlgFunction = glueWS.raiseErrorDialog(dialogs, "visualising genome feature");
								dlgFunction(response.data, response.status, response.headers, response.config);
						});
					}
				}
				
				
				$scope.updatePhyloSvg = function() {
					
					$scope.phyloVisualisationUpdating = true;
					$scope.phyloLegendUpdating = true;

					var sequenceReport = $scope.fileItemUnderAnalysis.sequenceReport;
					var placement = sequenceReport.covReport.placement;

					var cacheKey = $scope.fileItemUnderAnalysis.response.responseID+":"+
						sequenceReport.covReport.sequenceResult.id+":"+
						placement.placementIndex+":"+
						$scope.tipAnnotation.name+":"+
						$scope.aaFeature.name+":"+
						$scope.aaFeature.varType+":"+
						$scope.aaFeature.aaCodonLabel+":"+
						$scope.aaFeature.aaDeletionStart+":"+
						$scope.aaFeature.aaDeletionEnd+":"+
						$scope.aaFeature.aaInsertionStart+":"+
						$scope.aaFeature.aaInsertionAAs;
					console.info('cacheKey', cacheKey);
					

					var cachedSvgResultObject = $scope.phyloSvgResultObjectCache[cacheKey];
					
					if(cachedSvgResultObject != null) {
						$timeout(function() {
							console.info('phylo SVG result object found in cache');
							$scope.updatePhyloSvgFromResultObject(cacheKey, cachedSvgResultObject);
						});
					} else {
						var fileName = "visualisation.svg";
						var legendFileName = "legend.svg";
						var scrollbarWidth = 17;
						var segment = sequenceReport.covReport.sequenceResult.segment;
						glueWS.runGlueCommand("module/covSvgPhyloVisualisation", 
								{ 
									"invoke-function": {
										"functionName": "visualisePhyloAsSvg", 
										"document": {
											"inputDocument": {
											    "placerResult" : $scope.fileItemUnderAnalysis.response.covWebReport.placerResult, 
											    "placerModule" : sequenceReport.covReport.sequenceResult.placerModule,
											    "queryName" : sequenceReport.covReport.sequenceResult.id,
											    "queryNucleotides" : sequenceReport.covReport.sequenceResult.visualisationHints.queryNucleotides,
											    "targetReferenceName": sequenceReport.covReport.sequenceResult.visualisationHints.targetReferenceName,
											    "queryToTargetRefSegments": sequenceReport.covReport.sequenceResult.visualisationHints.queryToTargetRefSegments,
											    "aaVisFeature" : $scope.aaFeature.name,
											    "aaVisCodonLabel" : $scope.aaFeature.varType == 'aminoAcid' ? $scope.aaFeature.aaCodonLabel : null,
											    "aaVisDeletionStart" : $scope.aaFeature.varType == 'deletion' ? $scope.aaFeature.aaDeletionStart : null,
											    "aaVisDeletionEnd" : $scope.aaFeature.varType == 'deletion' ? $scope.aaFeature.aaDeletionEnd : null,
											    "aaVisInsertionLastBeforeStart" : $scope.aaFeature.varType == 'insertion' ? $scope.aaFeature.aaInsertionStart : null,
											    "aaVisInsertionFirstAfterEnd" : $scope.aaFeature.varType == 'insertion' ? $scope.aaFeature.aaInsertionStart+1 : null,
											    "aaVisInsertedAas" : $scope.aaFeature.varType == 'insertion' ? $scope.aaFeature.aaInsertionAAs : null,
											    "placementIndex" : placement.placementIndex,
												"pxWidth" : 1136 - scrollbarWidth, 
												"pxHeight" : "auto",
												"legendPxWidth" : 1136, 
												"legendPxHeight" : 80,
											    "fileName": fileName,
											    "tipAnnotation": $scope.tipAnnotation.name,
											    "legendFileName": legendFileName
											}
										}
									} 
								}
						).then(function onSuccess(response) {
							// Handle success
						    var data = response.data;
							console.info('visualisePhyloAsSvg result', data);
							var svgResultObj = data.visualisePhyloAsSvgResult;
							$scope.updatePhyloSvgFromResultObject(cacheKey, svgResultObj);
						}, function onError(response) {
							    // Handle error
								$scope.phyloVisualisationUpdating = false;
								$scope.phyloLegendUpdating = false;
								var dlgFunction = glueWS.raiseErrorDialog(dialogs, "visualising phylo tree");
								dlgFunction(response.data, response.status, response.headers, response.config);
						});
					}
				}
				
			    $scope.getPlacementLabel = function(placement) {
			    	return placement.placementIndex + " (" + toFixed(placement.likeWeightRatio * 100, 2) + "%)";
			    }
			    
				$scope.downloadExampleSequence = function() {
					var url;
					if(userAgent.os.family.indexOf("Windows") !== -1) {
						url = "exampleSequences/fullGenome1.fasta";
					} else {
						url = "exampleSequencesMsWindows/fullGenome1.fasta";
					}
					$http.get(url)
					.success(function(data, status, headers, config) {
						console.log("data", data);
				    	var blob = new Blob([data], {type: "text/plain"});
				    	saveFile.saveFile(blob, "example sequence file", "exampleSequence.fasta");
				    })
				    .error(glueWS.raiseErrorDialog(dialogs, "downloading example sequence file"));
				};


			    $scope.getFeatureCoverage = function(sequenceResult, featureName) {
			    	var coveragePct = 0.0;
			    	_.each(sequenceResult.featuresWithCoverage, function(fwc) {
			    		if(fwc.name == featureName) {
			    			coveragePct = fwc.coveragePct;
			    		}
			    	});
			    	return coveragePct;
			    }

			    $scope.getReplacements = function(sequenceResult, featureName) {
			    	var replacements = [];
			    	_.each(sequenceResult.replacements, function(repl) {
			    		if(repl.replacement.feature == featureName) {
			    			replacements.push(repl.replacement);
			    		}
			    	});
			    	return replacements;
			    }

			    $scope.getInsertions = function(sequenceResult, featureName) {
			    	var insertions = [];
			    	_.each(sequenceResult.insertions, function(ins) {
			    		if(ins.insertion.variationFeature == featureName) {
			    			insertions.push(ins.insertion);
			    		}
			    	});
			    	return insertions;
			    }

			    $scope.getDeletions = function(sequenceResult, featureName) {
			    	var deletions = [];
			    	_.each(sequenceResult.deletions, function(del) {
			    		if(del.deletion.variationFeature == featureName) {
			    			deletions.push(del.deletion);
			    		}
			    	});
			    	return deletions;
			    }

				$scope.switchToReplacementPhylo = function(report, feature, codonLabel) {
			    	$scope.setSequenceReport($scope.fileItemUnderAnalysis, report);
					var aaFeature = _.find($scope.availableFeatures, function(f) {return f.name == feature.name;});
			    	aaFeature.aaCodonLabel = parseInt(codonLabel);
			    	$scope.setAAFeature(aaFeature);
			    	$scope.setVarType("aminoAcid");
			    	$scope.displaySection = 'phyloPlacement';
				}

				$scope.switchToDeletionPhylo = function(report, feature, startCodon, endCodon) {
			    	$scope.setSequenceReport($scope.fileItemUnderAnalysis, report);
					var aaFeature = _.find($scope.availableFeatures, function(f) {return f.name == feature.name;});
			    	aaFeature.aaDeletionStart = parseInt(startCodon);
			    	aaFeature.aaDeletionEnd = parseInt(endCodon);
			    	$scope.setAAFeature(aaFeature);
			    	$scope.setVarType("deletion");
			    	$scope.displaySection = 'phyloPlacement';
				}

				$scope.switchToInsertionPhylo = function(report, feature, lastCodonBefore, insertedAAs, firstCodonAfter) {
			    	$scope.setSequenceReport($scope.fileItemUnderAnalysis, report);
					var aaFeature = _.find($scope.availableFeatures, function(f) {return f.name == feature.name;});
			    	aaFeature.aaInsertionStart = parseInt(lastCodonBefore);
			    	aaFeature.aaInsertionAAs = insertedAAs;
			    	$scope.setAAFeature(aaFeature);
			    	$scope.setVarType("insertion");
			    	$scope.displaySection = 'phyloPlacement';
				}

				$scope.switchToGenomeVisualisation = function(report, feature) {
			    	$scope.setSequenceReport($scope.fileItemUnderAnalysis, report);
			    	
			    	var rFeature = _.find(report.covReport.sequenceResult.visualisationHints.features, function(rf) {return rf.name == feature.name;});
			    	$scope.setFeature(report, rFeature);
			    	$scope.displaySection = 'genomeVisualisation';
				}

				$scope.getLineageDisplayString = function(sequenceResult) {
					if(sequenceResult.isForwardCov) {
						if(sequenceResult.lineageAssignmentResult != null &&
								sequenceResult.lineageAssignmentResult.bestLineage != null) {
							return sequenceResult.lineageAssignmentResult.bestLineage;
						} else {
							return "-";
						}
					} else {
						return "N/A";
					}
				}
				$scope.getLikelihoodDisplayString = function(sequenceResult) {
					if(sequenceResult.isForwardCov) {
						if(sequenceResult.lineageAssignmentResult != null &&
								sequenceResult.lineageAssignmentResult.bestLineage != null) {
							return toFixed(sequenceResult.lineageAssignmentResult.bestLikelihoodWeightRatio * 100, 2)+"%";
						} else {
							return "-";
						}
					} else {
						return "N/A";
					}
				}
				
				$scope.viewPPReport = function(fileItem, sequenceId, primerProbeMismatchReport) {
					if(fileItem.seqIdToReportUrl == null) {
						fileItem.seqIdToReportUrl = {};
					}
					var reportUrl = fileItem.seqIdToReportUrl[sequenceId];
					var fileName = "covPrimerProbeReport.html";
					if(reportUrl == null) {
						console.log("primerProbeMismatchReport", primerProbeMismatchReport);
						glueWS.runGlueCommand("module/covPrimerProbeReportTransformer", {
							"transform-to-web-file": {
								"webFileType": "WEB_PAGE",
								"commandDocument":primerProbeMismatchReport,
								"outputFile": fileName
							}
						})
						.success(function(data, status, headers, config) {
							console.info('transform-to-web-file result', data);
							var transformerResult = data.freemarkerDocTransformerWebResult;
							reportUrl = "/glue_web_files/"+transformerResult.webSubDirUuid+"/"+transformerResult.webFileName;
							fileItem.seqIdToReportUrl[sequenceId] = reportUrl;
							$window.open(reportUrl, '_blank');
						})
						.error(glueWS.raiseErrorDialog(dialogs, "rendering primer/probe report"));
					} else {
						$window.open(reportUrl, '_blank');
					}
				};
				
				
				
		}]);
