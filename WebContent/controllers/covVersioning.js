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

			glueWS.runGlueCommand("", {
			    "show":{
			        "setting":{
			            "settingName":"project-version"
			        }
			    }
			})
			.success(function(data, status, headers, config) {
				$scope.covGlueProjectVersion = data.projectShowSettingResult.settingValue;
			})
			.error(glueWS.raiseErrorDialog(dialogs, "retrieving project-version setting"));
			
			
			
		} ]);
