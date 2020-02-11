covApp.controller('covReplacementCtrl', 

		[ '$scope', '$route', '$routeParams','$controller', 'glueWS', 'glueWebToolConfig', 'dialogs', '$analytics', 'saveFile', 'FileSaver', '$http', '$window', '$timeout', 'pagingContext',
			  function($scope, $route, $routeParams, $controller, glueWS, glueWebToolConfig, dialogs, $analytics, saveFile, FileSaver, $http, $window, $timeout, pagingContext) {

			addUtilsToScope($scope);

			$scope.replacement = null;
			$scope.replacementId = $routeParams.id;
			
			$scope.displaySection = 'containingSequences';

			$scope.analytics = $analytics;
			$scope.phyloVisualisationUpdating = false;
			$scope.phyloLegendUpdating = false;
			$scope.phyloSvgResultObjectCache = {};
			$scope.residueAnalysis = false;

			$scope.availableTipAnnotations = [
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
			
			
			glueWS.runGlueCommand("custom-table-row/cov_replacement/"+$scope.replacementId, {
			    "render-object":{
			        "rendererModuleName":"covReplacementRenderer"
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.replacement = data.replacement;
				console.info('$scope.replacement', $scope.replacement);
				$scope.setTipAnnotation($scope.availableTipAnnotations[0]);

				var referenceAa = $scope.replacement.referenceAa;
				var replacementAa = $scope.replacement.replacementAa;
				
				if(referenceAa != '*' && referenceAa != 'X' && 
						replacementAa != '*' && replacementAa != 'X') {
					
					$scope.residueAnalysis = true;
					glueWS.runGlueCommand("module/covHanada2006ReplacementClassifier", {
						"classify":{
							"replacement":{
								"originalAA":referenceAa,
								"replacementAA":replacementAa
							}
						}
					})
					.success(function(data, status, headers, config) {
						$scope.hanadaResults = tableResultAsObjectList(data);
						console.info('$scope.hanadaResults', $scope.hanadaResults);
					})
					.error(glueWS.raiseErrorDialog(dialogs, "retrieving Hanada 2006 analysis"));
				}
			
			})
			.error(glueWS.raiseErrorDialog(dialogs, "rendering replacement"));



		    $scope.setTipAnnotation = function(tipAnnotation) {
		    	$scope.tipAnnotation = tipAnnotation;
		    	$scope.updatePhyloSvg();
		    }

			$scope.phyloSvgUpdated = function() {
				$scope.phyloVisualisationUpdating = false;
			}
			
			$scope.phyloLegendSvgUpdated = function() {
				$scope.phyloLegendUpdating = false;
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

			$scope.updatePhyloSvg = function() {
				
				$scope.phyloVisualisationUpdating = true;
				$scope.phyloLegendUpdating = true;

				var cacheKey = $scope.tipAnnotation.name;
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
					glueWS.runGlueCommand("module/covSvgPhyloVisualisation", 
							{ 
								"invoke-function": {
									"functionName": "visualisePhyloAsSvg", 
									"document": {
										"inputDocument": {
										    "aaVisFeature" : $scope.replacement.feature,
										    "aaVisCodonLabel" : $scope.replacement.codonLabel,
											"pxWidth" : 1136 - scrollbarWidth, 
											"pxHeight" : 2500,
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
			
			$scope.seqWhereClause = "cov_replacement_sequence.cov_replacement.id = '"+$scope.replacementId+"'";

			$scope.updateSeqPage = function(pContext) {
				console.log("updateSeqPage", pContext);
				
				var cmdParams = {
						"whereClause": $scope.seqWhereClause,
						"fieldName": ["sequenceID", 
							"isolate",
							"collection_month_day", 
							"collection_month", 
							"collection_year", 
							"m49_country.display_name",
							"m49_country.id",
							"place_sampled"
						]
				};
				pContext.extendListCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
				    "list": {
				    	"sequence" : cmdParams
				    }
				})
			    .success(function(data, status, headers, config) {
			    	 $scope.listSequenceResult = tableResultAsObjectList(data);
			    	 console.info('listing sequences as object list', $scope.listSequenceResult);
			    })
			    .error(glueWS.raiseErrorDialog(dialogs, "listing sequences"));
			}
			
			$scope.updateSeqCount = function(pContext) {
				console.log("updateSeqCount", pContext);
				
				var cmdParams = {
			            "whereClause": $scope.seqWhereClause
				};
				pContext.extendCountCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
			    	"count": { 
				        "sequence":cmdParams
			    	} 
				})
			    .success(function(data, status, headers, config) {
					console.info('count sequences', data);
					$scope.seqPagingContext.setTotalItems(data.countResult.count);
					$scope.seqPagingContext.firstPage();
			    })
			    .error(glueWS.raiseErrorDialog(dialogs, "counting sequences"));
			}
			
			$scope.seqPagingContext = pagingContext.createPagingContext($scope.updateSeqCount, $scope.updateSeqPage);

			$scope.seqPagingContext.setDefaultSortOrder([
  	            { property:"sequenceID", displayName: "GISAID ID", order: "-"}
			]);

			$scope.seqPagingContext.setSortableProperties([
  	            { property:"sequenceID", displayName: "GISAID ID"}
            ]);

			$scope.seqPagingContext.setFilterProperties([
	            { property: "m49_country.display_name", altProperties:["m49_country.id"], displayName: "Country", filterHints: {type: "String"} }
			]);
			                          			
			$scope.seqPagingContext.setDefaultFilterElems([]);

			$scope.seqPagingContext.countChanged();
			
		}]);
