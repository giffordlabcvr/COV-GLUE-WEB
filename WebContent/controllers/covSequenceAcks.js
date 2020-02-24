covApp.controller('covSequenceAcksCtrl', 
		[ '$scope', '$route', '$routeParams', 'glueWS', 'dialogs', 'pagingContext', 
			  function($scope, $route, $routeParams, glueWS, dialogs, pagingContext) {

				addUtilsToScope($scope);

				$scope.sequences = [];

				glueWS.runGlueCommand("", {
				    "list":{
				        "sequence":{
				            "fieldName":[
				                "m49_country.display_name",
				                "sequenceID",
				                "isolate",
				                "submitting_lab",
				                "originating_lab",
				                "authors"
				            ]
				        }
				    }
				})
			    .success(function(data, status, headers, config) {
			    	$scope.sequences = tableResultAsObjectList(data);
			    	console.log("$scope.sequences", $scope.sequences);
			    })
			    .error(glueWS.raiseErrorDialog(dialogs, "retreiving sequence data"));

		}]);
