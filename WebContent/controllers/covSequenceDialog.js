covApp.controller('covSequenceDialogCtrl',function($scope,$modalInstance,data){
	$scope.sequence = data;
	
	addUtilsToScope($scope);
	
	$scope.dismiss = function(){
		$modalInstance.dismiss('Dismissed');
	}; 
})