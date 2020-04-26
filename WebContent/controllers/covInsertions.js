covApp.controller('covInsertionsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'dialogs', 'pagingContext', 
		  function($scope, $route, $routeParams, glueWS, dialogs, pagingContext) {

			addUtilsToScope($scope);

			$scope.insertions = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"

			
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

		}]);
