covApp.controller('covMutationsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'dialogs', 'pagingContext', 
		  function($scope, $route, $routeParams, glueWS, dialogs, pagingContext) {

			addUtilsToScope($scope);

			$scope.mutations = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"

			
			$scope.updateCount = function(pContext) {
				console.log("updateCount", pContext);
				var cmdParams = {
						"tableName": "cov_mutation",
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
			    .error(glueWS.raiseErrorDialog(dialogs, "counting polymorphisms"));
			}
			
			$scope.updatePage = function(pContext) {
				console.log("updatePage", pContext);
				var cmdParams = {
						"tableName": "cov_mutation",
						"allObjects": false,
			            "whereClause":$scope.whereClause,
			            "rendererModuleName": "covListMutationsRenderer"
				};
				pContext.extendListCmdParams(cmdParams);
				glueWS.runGlueCommand("", {
			    	"multi-render": cmdParams 
				})
				.success(function(data, status, headers, config) {
					$scope.mutations = data.multiRenderResult.resultDocument;
					console.info('$scope.mutations', $scope.mutations);
				})
				.error(glueWS.raiseErrorDialog(dialogs, "retrieving mutations"));
			}
			
			$scope.pagingContext = pagingContext.createPagingContext($scope.updateCount, $scope.updatePage);

			$scope.pagingContext.setDefaultSortOrder([
	            { property:"num_seqs", displayName: "Containing sequences", order: "-" }
			]);

  			$scope.pagingContext.setSortableProperties([
  	            { property:"num_seqs", displayName: "Containing sequences" },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region" },
  	            { property:"codon_label_int", displayName: "Codon number" },
  	            { property:"reference_aa", displayName: "Original amino acid" },
  	            { property:"mutation_aa", displayName: "Mutation amino acid" }
              ]);

			$scope.pagingContext.setFilterProperties([
  	            { property:"num_seqs", displayName: "Containing sequences", filterHints: {type: "Integer"}  },
  	            { property:"variation.featureLoc.feature.name", displayName: "Virus genome region", altProperties:["variation.featureLoc.feature.displayName"], filterHints: {type: "String"}  },
  	            { property:"codon_label_int", displayName: "Codon number", filterHints: {type: "Integer"}  },
  	            { property:"reference_aa", displayName: "Original amino acid", filterHints: {type: "String"}  },
  	            { property:"mutation_aa", displayName: "Mutation amino acid", filterHints: {type: "String"}  }
	        ]);
			                          			                          			
  			$scope.pagingContext.setDefaultFilterElems([]);
  			$scope.pagingContext.countChanged();

		}]);
