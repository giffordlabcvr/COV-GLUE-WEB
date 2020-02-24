covApp.controller('covVersioningCtrl', 
		[ '$scope', 'glueWS', 'dialogs', 
		function($scope, glueWS, dialogs) {

			glueWS.runGlueCommand("", {
			    "glue-engine":{
			        "show-version":{}
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.glueEngineVersion = data.glueEngineShowVersionResult.glueEngineVersion;
			})
			.error(glueWS.raiseErrorDialog(dialogs, "retrieving GLUE engine version"));
			
		} ]);
