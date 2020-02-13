covApp.controller('covDeletionsCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'dialogs', 'pagingContext', 
		  function($scope, $route, $routeParams, glueWS, dialogs, pagingContext) {

			addUtilsToScope($scope);

			$scope.deletions = [];

			$scope.pagingContext = null;
			$scope.whereClause = "true"

			
			$scope.updateCount = function(pContext) {
				console.log("updateCount", pContext);
				var cmdParams = {
						"tableName": "cov_deletion",
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
						"tableName": "cov_deletion",
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

		}]);
