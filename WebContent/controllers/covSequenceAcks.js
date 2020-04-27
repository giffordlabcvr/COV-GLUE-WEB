covApp.controller('covSequenceAcksCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'dialogs', '$controller', 'pagingContext', 
			  function($scope, $route, $routeParams, glueWS, dialogs, $controller, pagingContext) {
			$controller('sequencesCtrl', { $scope: $scope, 
				glueWebToolConfig: glueWebToolConfig, 
				glueWS: glueWS, 
				dialogs: dialogs});

			console.log("initializing cov sequences");

			$scope.init("source.name = 'cov-gisaid'", 
					["m49_country.display_name",
		                "sequenceID",
		                "isolate",
		                "gisaid_originating_lab",
		                "gisaid_submitting_lab",
		                "gisaid_authors"] );
			
			$scope.initGlobalRegionFixedValueSetM49();
			$scope.initDevelopmentStatusFixedValueSetM49();

			
			$scope.pagingContext.setDefaultSortOrder([
  			    { property: "sequenceID", displayName: "GISAID Accession ID", order: "+" }
  			]);

			$scope.pagingContext.setSortableProperties([
	            { property:"sequenceID", displayName: "GISAID Accession ID" },
  	            { property:"m49_country.id", displayName: "Country of Origin" },
	            { property:"isolate", displayName: "Virus name" }
	        ]);

			$scope.pagingContext.setFilterProperties([
           		{ property:"sequenceID", displayName: "GISAID Accession ID", filterHints: {type: "String"} },
  	            { property:"m49_country.display_name", nullProperty:"m49_country", altProperties:["m49_country.id"], displayName: "Country of Origin", filterHints: {type: "String"} },
  	            $scope.globalRegionFilterM49(),
  	            $scope.developmentStatusFilterM49(),
  	            { property:"isolate", displayName: "Virus name", filterHints: {type: "String"} },
  			]);

  			$scope.pagingContext.setDefaultFilterElems([]);
			
			
}]);

