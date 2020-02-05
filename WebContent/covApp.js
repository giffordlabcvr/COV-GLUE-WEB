	  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	  })(window,document,'script','https:www.google-analytics.com/analytics.js','ga');
	
	  console.log("document.location.hostname", document.location.hostname);
	  var trackingID;
	  if(document.location.hostname.indexOf("cov-glue.cvr.gla.ac.uk") >= 0) {
		  // COV-GLUE production analytics account
		  trackingID = 'UA-157355923-1';
		  ga('create', trackingID, 'auto');
	  } else {
		  // sandbox analytics account
		  trackingID = 'UA-93752139-1';
		  ga('create', trackingID, 'none');
	  }

var covApp = angular.module('covApp', [
    'ngRoute',
    'projectBrowser', 
    'angularFileUpload', 
    'glueWS',
    'glueWebToolConfig',
    'treeControl',
    'angulartics',
    'angulartics.google.analytics',
    'angular-cookie-law',
    'hljs',
    'rzModule'
  ]);

console.log("after covApp module definition");

covApp.config(['$routeProvider', 'projectBrowserStandardRoutesProvider',
  function($routeProvider, projectBrowserStandardRoutesProvider) {
	
	var projectBrowserStandardRoutes = projectBrowserStandardRoutesProvider.$get();
	var projectBrowserURL = "../gluetools-web/www/projectBrowser";

	// home page
	$routeProvider.
    when('/home', {
        templateUrl: '../views/covFastaAnalysis.html',
        controller: 'covFastaAnalysisCtrl'
      });

	// replacements list
	$routeProvider.
    when('/replacement', {
        templateUrl: '../views/covReplacements.html',
        controller: 'covReplacementsCtrl'
      });

	// specific replacement
	$routeProvider.
    when('/project/replacement/:id', {
    	  templateUrl: 'views/covReplacement.html',
    	  controller: 'covReplacementCtrl'
        });

    // about page
    $routeProvider.
    when('/about', {
  	  templateUrl: '../views/covAbout.html',
  	  controller: 'covAboutCtrl'
    });

    // default
    $routeProvider.
    otherwise({
  	  redirectTo: '/home'
    });

	
	
}]);

covApp.controller('covAppCtrl', 
  [ '$scope', 'glueWS', 'glueWebToolConfig',
function ($scope, glueWS, glueWebToolConfig) {
	$scope.brand = "CoV-GLUE";
	$scope.homeMenuTitle = "Home";
	$scope.aboutMenuTitle = "About";
	$scope.replacementsMenuTitle = "Amino acid replacements";
	glueWS.setProjectURL("../../../gluetools-ws/project/cov");
	glueWS.setAsyncURL("../../../gluetools-ws");
	glueWebToolConfig.setAnalysisToolURL("../gluetools-web/www/analysisTool");
	glueWebToolConfig.setAnalysisToolExampleSequenceURL("exampleSequences/fullGenome1.fasta");
	glueWebToolConfig.setAnalysisToolExampleMsWindowsSequenceURL("exampleSequencesMsWindows/fullGenome1.fasta");
	glueWebToolConfig.setProjectBrowserURL("../gluetools-web/www/projectBrowser");
	glueWebToolConfig.setGlueWSURL("../gluetools-web/www/glueWS");
} ]);


