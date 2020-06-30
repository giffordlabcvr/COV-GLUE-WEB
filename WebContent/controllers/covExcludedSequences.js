covApp.controller('covExcludedSeqsCtrl', 
		[ '$scope', 'glueWS', 'dialogs', 
		function($scope, glueWS, dialogs) {

			glueWS.runGlueCommand("custom-table-row/cov_project_properties/sequencesRetrieved", {
			    "show":{
			        "property":{
			            "property":"value"
			        }
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.sequencesRetrieved = data.propertyValueResult.value;
				console.info('$scope.sequencesRetrieved', $scope.sequencesRetrieved);
			})
			.error(glueWS.raiseErrorDialog(dialogs, "retrieving sequencesRetrieved project property"));

			glueWS.runGlueCommand("custom-table-row/cov_project_properties/sequencesPassingExclusion", {
			    "show":{
			        "property":{
			            "property":"value"
			        }
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.sequencesPassingExclusion = data.propertyValueResult.value;
				console.info('$scope.sequencesPassingExclusion', $scope.sequencesPassingExclusion);
			})
			.error(glueWS.raiseErrorDialog(dialogs, "retrieving sequencesPassingExclusion project property"));

			
		} ]);
