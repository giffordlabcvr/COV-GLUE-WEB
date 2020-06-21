covApp.controller('covInsertionCtrl', 

		[ '$scope', '$route', '$routeParams','$controller', 'glueWS', 'glueWebToolConfig', 'dialogs', '$analytics', 'saveFile', 'FileSaver', '$http', '$window', '$timeout', 'pagingContext',
			  function($scope, $route, $routeParams, $controller, glueWS, glueWebToolConfig, dialogs, $analytics, saveFile, FileSaver, $http, $window, $timeout, pagingContext) {

			$controller('covVariationCtrl', { $scope: $scope, 
				glueWebToolConfig: glueWebToolConfig, 
				glueWS: glueWS, 
				dialogs: dialogs});
			
			$scope.insertion = null;
			$scope.insertionId = $routeParams.id;
			
			$scope.displaySection = 'containingSequences';

			$scope.analytics = $analytics;
			$scope.phyloVisualisationUpdating = false;
			$scope.phyloLegendUpdating = false;
			$scope.phyloSvgResultObjectCache = {};

			$scope.initGlobalRegionFixedValueSetM49();

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
					name: "sequenceID",
					displayName: "Sequence ID"
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
			
			
			glueWS.runGlueCommand("custom-table-row/cov_nt_insertion/"+$scope.insertionId, {
			    "render-object":{
			        "rendererModuleName":"covInsertionRenderer"
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.insertion = data.insertion;
				console.info('$scope.insertion', $scope.insertion);
				$scope.setTipAnnotation($scope.availableTipAnnotations[0]);
			})
			.error(glueWS.raiseErrorDialog(dialogs, "rendering insertion"));


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
										    "visFeature" : $scope.insertion.feature,
										    "visInsertionLastNtBeforeStart" : $scope.insertion.lastRefNtBefore,
										    "visInsertionFirstNtAfterEnd" : $scope.insertion.firstRefNtAfter,
										    "visInsertedNts" : $scope.insertion.insertedNts,
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
			
			$scope.seqWhereClause = "cov_nt_insertion_sequence.cov_nt_insertion.id = '"+$scope.insertionId+"'";

			$scope.updateSeqPage = function(pContext) {
				console.log("updateSeqPage", pContext);
				
				var cmdParams = {
						"whereClause": $scope.seqWhereClause,
						"fieldName": ["sequenceID", 
							"isolate",
							"cov_glue_lineage",
							"cov_glue_lw_ratio",
							"gisaid_lineage",
							"gisaid_clade",
							"collection_month_day", 
							"collection_month", 
							"collection_year", 
							"m49_country.display_name",
							"m49_country.id",
							"m49_country.m49_sub_region.display_name",
							"place_sampled",
							"gisaid_authors",
							"gisaid_originating_lab",
							"gisaid_submitting_lab",
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
  	            { property: "sequenceID", displayName: "GISAID ID"},
	            { property: "place_sampled", displayName: "Location"},
	            { property: "m49_country.display_name", displayName: "Country"},
        		{ property: "collection_date", displayName: "Collection Date"},
	            { property: "cov_glue_lineage_sortable", displayName: "Lineage"},
            ]);

			$scope.seqPagingContext.setFilterProperties([
  	            { property: "sequenceID", displayName: "GISAID ID", filterHints: {type: "String"} },
	            { property: "place_sampled", displayName: "Location", filterHints: {type: "String"} },
	            { property: "m49_country.display_name", altProperties:["m49_country.id"], displayName: "Country", filterHints: {type: "String"} },
  	            $scope.globalRegionFilterM49(),
	            { property: "collection_date", displayName: "Collection Date", filterHints: {type: "Date"} },
	            { property: "cov_glue_lineage", displayName: "Lineage", filterHints: {type: "String"} },
			]);
			                          			
			$scope.seqPagingContext.setDefaultFilterElems([]);

			$scope.seqPagingContext.countChanged();
			
			$scope.showSequenceDialog = function(seq) {
				  dialogs.create('/dialogs/covSequenceDialog.html','covSequenceDialogCtrl',seq,{ size:"md"});
			}
		}]);
