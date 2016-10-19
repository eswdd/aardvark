aardvark.controller('UserPrefsDialogCtrl', function ($uibModalInstance, userPrefs, userPrefsInputTitles) {
    var $ctrl = this;
    $ctrl.boolInputs = []
    $ctrl.stringInputs = []
    
    $ctrl.loadView = function() {
        for (var key in userPrefs) {
            if (userPrefs.hasOwnProperty(key) && key != "boolFields") {
                var input = { key: key, value: userPrefs[key], title: key };
                if (userPrefsInputTitles.hasOwnProperty(key)) {
                    input.title = userPrefsInputTitles[key];
                }
                if (userPrefs.boolFields.indexOf(key) >= 0) {
                    $ctrl.boolInputs.push(input);
                }
                else {
                    $ctrl.stringInputs.push(input);
                }
            }
        }
    }

    $ctrl.ok = function () {
        var updatedPrefs = {}
        for (var s=0; s<$ctrl.stringInputs.length; s++) {
            var input = $ctrl.stringInputs[s];
            updatedPrefs[input.key] = intput.value;
        }
        for (var b=0; b<$ctrl.boolInputs.length; b++) {
            var input = $ctrl.boolInputs[b];
            updatedPrefs[input.key] = input.value == true || input.value == "true";
        }
        $uibModalInstance.close(updatedPrefs);
    };

    $ctrl.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $ctrl.loadView();
});
