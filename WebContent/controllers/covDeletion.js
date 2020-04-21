covApp.controller('covDeletionCtrl', 

		[ '$scope', '$route', '$routeParams','$controller', 'glueWS', 'glueWebToolConfig', 'dialogs', '$analytics', 'saveFile', 'FileSaver', '$http', '$window', '$timeout', 'pagingContext',
			  function($scope, $route, $routeParams, $controller, glueWS, glueWebToolConfig, dialogs, $analytics, saveFile, FileSaver, $http, $window, $timeout, pagingContext) {

			addUtilsToScope($scope);

			$scope.deletion = null;
			$scope.deletionId = $routeParams.id;
			
			$scope.displaySection = 'containingSequences';

			$scope.analytics = $analytics;
			$scope.phyloVisualisationUpdating = false;
			$scope.phyloLegendUpdating = false;
			$scope.phyloSvgResultObjectCache = {};

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
			
			
			glueWS.runGlueCommand("custom-table-row/cov_deletion/"+$scope.deletionId, {
			    "render-object":{
			        "rendererModuleName":"covDeletionRenderer"
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.deletion = data.deletion;
				console.info('$scope.deletion', $scope.deletion);
				$scope.setTipAnnotation($scope.availableTipAnnotations[0]);
			})
			.error(glueWS.raiseErrorDialog(dialogs, "rendering deletion"));


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
										    "aaVisFeature" : $scope.deletion.feature,
										    "aaVisDeletionStart" : $scope.deletion.startCodon,
										    "aaVisDeletionEnd" : $scope.deletion.endCodon,
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
			
			$scope.seqWhereClause = "cov_deletion_sequence.cov_deletion.id = '"+$scope.deletionId+"'";

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
