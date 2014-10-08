'use strict';

angular.module('tatool.module')
  .service('executableService', ['$log', '$rootScope', '$injector', '$q', 'contextService', 'tatoolPhase', 'tatoolExecutable',
    function ($log, $rootScope, $injector, $q, contextService, tatoolPhase, tatoolExecutable) {

    var executableService = {};

    var executables = {};

    var numExecutables = 0;

    // reset the list of executables
    executableService.init = function(runningExecutor) {
      executables = {};
      tatoolExecutable.init(runningExecutor);
    };

    // create a new executable from service and register
    executableService.addExecutable = function(executableJson) {
      var ExecutableService = $injector.get(executableJson.customType);
      var executable = new ExecutableService();
      angular.extend(executable, executableJson);
      this.registerExecutable(executable.name, executable);
      return executable;
    };

    // register a handler
    executableService.registerExecutable = function(name, executable) {
      executables[name] = executable;
      numExecutables++;
    };

    // get a specific handler
    executableService.getExecutable = function(name) {
      return executables[name];
    };

    // run init method on all executables (preloading)
    executableService.initAllExecutables = function() {
      var deferred = $q.defer();
      var i = 0;

      for (var key in executables) {
        i++;
        runInit(key, i, deferred);
      }

      return deferred.promise;
    };

    var runInit = function(key, i, initAllDeferred) {
      if ('init' in executables[key]) {
        var deferred = executables[key].init();

        if (deferred && deferred.promise) {
          deferred.promise.then(function(response) {
            reportProgress(key, i, initAllDeferred);
          }, function(error) {
            initAllDeferred.reject(error);
          });
        } else {
          reportProgress(key, i, initAllDeferred);
        }
      } else {
        reportProgress(key, i, initAllDeferred);
      }
    }

    var reportProgress = function(key, i, initAllDeferred) {
      if (i === numExecutables) {
        initAllDeferred.resolve();
      } else {
        console.log('Finished init on executable ' + key);
      }
    };

    // informs all executables
    executableService.informAllExecutables = function(phase) {
      for (var key in executables) {
        if ('processPhase' in executables[key]) {
          executables[key].processPhase(phase);
        }
      }
    };

    // informs all executables in current elementStack
    executableService.informExecutablesInStack = function(phase) {
      var elementStack = contextService.getProperty('elementStack');
      for (var i = 0; i < elementStack.length; i++) {
        var currentElement = elementStack[i];
        if ('tatoolType' in currentElement && currentElement.tatoolType === 'Executable' && 'processPhase' in executables[currentElement.name]) {
          executables[currentElement.name].processPhase(phase);
        }
      }
    };

    // listen to broadcast events on $rootScope and inform executables
    $rootScope.$on(tatoolPhase.SESSION_START, function(arg) {
      executableService.informAllExecutables(arg.name);
    });
    $rootScope.$on(tatoolPhase.EXECUTABLE_START, function(arg, stack) {
      executableService.informExecutablesInStack(arg.name, stack.displayAll());
    });
    $rootScope.$on(tatoolPhase.EXECUTABLE_END, function(arg, stack) {
      executableService.informExecutablesInStack(arg.name, stack.displayAll());
    });
    $rootScope.$on(tatoolPhase.SESSION_END, function(arg) {
      executableService.informAllExecutables(arg.name);
    });

    return executableService;
  }]);
