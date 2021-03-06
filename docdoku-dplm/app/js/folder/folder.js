(function () {

    'use strict';

    angular.module('dplm.pages')

        .config(function ($routeProvider) {

            $routeProvider
                .when('/folder/:uuid', {
                    templateUrl: 'js/folder/folder.html',
                    controller: 'FolderController'
                });
        })

        .controller('FolderController', function ($scope, $routeParams, $filter, $mdDialog, $q, $window,
                                                  FolderService, DBService, RepositoryService, WorkspaceService, ConfigurationService, FileUtils) {


            var folder = FolderService.getFolder({uuid: $routeParams.uuid});
            var folderPath = folder.path;
            var allFiles = [];
            var filteredFiles = [];
            var translate = $filter('translate');
            var filter = $filter('filter');
            var utcToLocalDateTime = $filter('utcToLocalDateTime');
            var lastIteration = $filter('lastIteration');
            var filterCanCheckOut = $filter('canCheckOut');
            var filterCanCheckIn = $filter('canCheckIn');
            var filterCanUndoCheckOut = $filter('canUndoCheckOut');
            var isFileHidden = $filter('isFileHidden');
            var filterCanPushFiles = filterCanCheckIn;
            var repositoryIndex = RepositoryService.getRepositoryIndex(folderPath);
            var fs = $window.require('fs');

            $scope.folder = folder;
            $scope.configuration = ConfigurationService.configuration;

            $scope.query = {
                limit: 10,
                limits: [10, 20, 50, 100],
                page: 1
            };

            $scope.paginationLabels = {
                page: translate('PAGINATION_LABELS_PAGE'),
                rowsPerPage: translate('PAGINATION_LABELS_ROWS_PER_PAGE'),
                of: translate('PAGINATION_LABELS_OF')
            };

            $scope.selected = [];

            $scope.filters = [
                {name: translate('DOCUMENTS'), code: 'DOCUMENTS', value: true},
                {name: translate('PARTS'), code: 'PARTS', value: true},
                {name: translate('CHECKED_OUT'), code: 'CHECKED_OUT', value: true},
                {name: translate('CHECKED_IN'), code: 'CHECKED_IN', value: true},
                {name: translate('RELEASED'), code: 'RELEASED', value: true},
                {name: translate('OBSOLETE'), code: 'OBSOLETE', value: true},
                {name: translate('LOCKED'), code: 'LOCKED', value: true},
                {name: translate('OUT_OF_INDEX'), code: 'OUT_OF_INDEX', value: true},
                {name: translate('SHOW_HIDDEN_FILES'), code: 'SHOW_HIDDEN_FILES', value: false}
            ];

            $scope.sync = {
                running: false,
                progress: 0,
                total: 0
            };

            var fetchFolder = function () {
                $scope.sync.running = true;
                return FolderService.recursiveReadDir(folderPath)
                    .then(function (files) {
                        $scope.totalFilesInFolder = files.length;
                        allFiles = files;
                        search();
                        $scope.sync.running = false;
                    });
            };

            var sortFiles = function (a, b) {
                return b.stat.mtime.getTime() - a.stat.mtime.getTime();
            };

            var hasFilter = function (code) {
                return $scope.filters.filter(function (filter) {
                        return filter.code === code && filter.value;
                    }).length > 0;
            };

            var search = function () {

                filteredFiles = allFiles.filter(function (path) {

                    var index = RepositoryService.getFileIndex(repositoryIndex, path);

                    if (!hasFilter('SHOW_HIDDEN_FILES') && isFileHidden(path)) {
                        return false;
                    }

                    if (!hasFilter('OUT_OF_INDEX') && !index) {
                        return false;
                    }

                    if (!hasFilter('DOCUMENTS') && index && index.documentMasterId) {
                        return false;
                    }

                    if (!hasFilter('PARTS') && index && index.number) {
                        return false;
                    }

                    return true;
                }).map(function (path) {
                    var file = FolderService.createFileObject(path);
                    file.index = RepositoryService.getFileIndex(repositoryIndex, path);
                    file.stat = FileUtils.stat(path);
                    return file;
                });

                // Fetch data from db if not cached : allow to filter also on entities internal data
                var chain = $q.when();
                filteredFiles.forEach(function (file) {
                    if (file.index) {
                        chain = chain.then(function () {
                            return fetchFileItem(file);
                        });
                    }
                });

                chain.then(function () {

                    filteredFiles = filteredFiles.filter(function (file) {

                        var item = file.item;

                        if (!hasFilter('CHECKED_OUT') && item && item.checkOutUser && item.checkOutUser.login === ConfigurationService.configuration.login) {
                            return false;
                        }

                        if (!hasFilter('CHECKED_IN') && item && !item.checkOutUser && !item.releaseAuthor && !item.obsoleteAuthor) {
                            return false;
                        }

                        if (!hasFilter('LOCKED') && item && item.checkOutUser && item.checkOutUser.login !== ConfigurationService.configuration.login) {
                            return false;
                        }

                        if (!hasFilter('RELEASED') && item && item.releaseAuthor && !item.obsoleteAuthor) {
                            return false;
                        }

                        if (!hasFilter('OBSOLETE') && item && item.obsoleteAuthor) {
                            return false;
                        }

                        if ($scope.pattern && filter([file], $scope.pattern).length === 0) {
                            return false;
                        }

                        return true;
                    });

                    $scope.filteredFilesCount = filteredFiles.length;
                    $scope.actions.paginate(1, $scope.query.limit);
                });

            };

            var watchers = [];

            var clearWatchers = function(){
                watchers.forEach(function(watcher){
                    watcher.close();
                });
                watchers.length = 0;
            };

            var addWatchers = function(){
                clearWatchers();
                watchers = $scope.displayedFiles.map(function(file){
                    var watcher;
                    watcher = fs.watch(file.path,function(eventType){
                        if('change' === eventType){
                            fetchFileItem(file);
                        }
                    });
                    return watcher;
                });
            };

            var refreshDisplay = function () {
                $scope.displayedFiles.map(fetchFileItem);
                addWatchers();
            };

            var fetchFileItem = function(file){
                file.stat = FileUtils.stat(file.path);
                file.index = RepositoryService.getFileIndex(repositoryIndex, file.path);
                if(file.index){
                    return DBService.getItem(file.index).then(function (item) {
                        file.item = item;
                        file.outOfDate = RepositoryService.isOutOfDate(repositoryIndex, file);
                        file.modified = RepositoryService.isModified(repositoryIndex, file.path);
                    });
                }
            };

            var getLocalChangesAsSelection = function () {

                var changes = RepositoryService.getLocalChanges($scope.folder);
                var selection = [];

                angular.forEach(changes,function(path){
                    var file = FolderService.createFileObject(path);
                    fetchFileItem(file);
                    selection.push(file);
                });

                return selection;
            };


            $scope.actions = {

                checkIn: function (selection) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/check-in.html',
                        fullscreen: true,
                        controller: 'CheckInCtrl',
                        locals: {
                            selection: filterCanCheckIn(selection),
                            folderPath: folderPath
                        }
                    }).then(refreshDisplay);
                },

                checkOut: function (selection) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/check-out.html',
                        fullscreen: true,
                        controller: 'CheckOutCtrl',
                        locals: {
                            selection: filterCanCheckOut(selection),
                            folderPath: folderPath
                        }
                    }).then(refreshDisplay);
                },

                undoCheckOut: function (selection) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/undo-check-out.html',
                        fullscreen: true,
                        controller: 'UndoCheckOutCtrl',
                        locals: {
                            selection: filterCanUndoCheckOut(selection),
                            folderPath: folderPath
                        }
                    }).then(refreshDisplay);
                },

                push: function (selection) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/push.html',
                        fullscreen: true,
                        controller: 'PushCtrl',
                        locals: {
                            selection: filterCanPushFiles(selection),
                            folderPath: folderPath
                        }
                    }).then(refreshDisplay);
                },

                pushUpdates: function () {
                    $mdDialog.show({
                        templateUrl: 'js/folder/push.html',
                        fullscreen: true,
                        controller: 'PushCtrl',
                        locals: {
                            selection: getLocalChangesAsSelection(),
                            folderPath: folderPath
                        }
                    }).then(refreshDisplay);
                },

                createFile: function () {
                    $mdDialog.show({
                        templateUrl: 'js/folder/create-file.html',
                        fullscreen: true,
                        controller: 'CreateFileCtrl',
                        locals: {
                            folderPath: folderPath
                        }
                    }).then(function (path) {
                        allFiles.push(path);
                        var file = FolderService.createFileObject(path);
                        file.stat = FileUtils.stat(path);
                        $scope.displayedFiles.push(file);
                    });
                },

                createPart: function (file) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/create-part.html',
                        fullscreen: true,
                        controller: 'PartCreationCtrl',
                        locals: {
                            file: file,
                            folderPath: folderPath
                        }
                    });
                },

                createDocument: function (file) {
                    $mdDialog.show({
                        templateUrl: 'js/folder/create-document.html',
                        fullscreen: true,
                        controller: 'DocumentCreationCtrl',
                        locals: {
                            file: file,
                            folderPath: folderPath
                        }
                    });
                },

                reveal: function () {
                    FolderService.reveal(folderPath);
                },

                shell: function () {
                    FolderService.shell(folderPath);
                },

                toggleFavorite: function () {
                    $scope.folder.favorite = !$scope.folder.favorite;
                    FolderService.save();
                },

                deleteFolder: function () {
                    $mdDialog.show({
                        templateUrl: 'js/folder/delete-folder.html',
                        controller: 'DeleteFolderCtrl',
                        locals: {
                            folder: $scope.folder
                        }
                    });
                },

                toggleFilters: function (state) {
                    angular.forEach($scope.filters, function (filter) {
                        filter.value = state;
                    });
                    search();
                },

                paginate: function (page, count) {
                    var start = (page - 1) * count;
                    var end = start + count;
                    $scope.displayedFiles = filteredFiles.sort(sortFiles).slice(start, end);
                    addWatchers();
                },

                syncIndex: function () {
                    $scope.sync.running = true;
                    RepositoryService.syncIndex(folderPath)
                        .then(fetchFolder, null, function (sync) {
                            $scope.sync.total = sync.total;
                            $scope.sync.progress = sync.progress;
                        }).catch(function (err) {
                            $scope.sync = err;
                            console.log('Something failed while sync index');
                        }).finally(function () {
                            $scope.sync.total = 0;
                            $scope.sync.progress = 0;
                        });
                },

                fetchFolder: fetchFolder,
                applyFilters: search

            };

            fetchFolder();

            $scope.$on("$destroy", function () {
                clearWatchers();
            });

        })

        .controller('AddFolderCtrl', function ($scope, $mdDialog,
                                               FolderService) {

            $scope.search = function (files) {
                var file = files[0];
                if (file) {
                    FolderService.add(file.path);
                    $mdDialog.hide(file.path);
                }
            };

            $scope.close = $mdDialog.hide;

        })
        .controller('CreateFileCtrl', function ($scope, $mdDialog,
                                                FileUtils, folderPath) {

            $scope.data = {
                regex: /^[^\/]+$/,
                fileName: ''
            };

            $scope.close = $mdDialog.hide;

            $scope.create = function () {
                var file = FileUtils.createFile(folderPath, $scope.data.fileName);
                if (file) {
                    $mdDialog.hide(file);
                }
            };


        })
        .controller('DocumentCreationCtrl', function ($scope, $mdDialog,
                                                      WorkspaceService, UploadService, RepositoryService, DBService,
                                                      file, folderPath) {

            $scope.file = file;
            $scope.workspaces = WorkspaceService.workspaces;

            var onError = function (error) {
                $scope.creating = false;
                $scope.error = error;
            };

            $scope.close = $mdDialog.hide;

            $scope.create = function () {
                $scope.creating = true;
                WorkspaceService.createDocumentInWorkspace($scope.document).then(function (document) {
                    $scope.document = document;
                    RepositoryService.saveItemToIndex(folderPath, file.path, document);
                    return UploadService.uploadFileToDocument(file.path, document);
                }).then(function () {
                    RepositoryService.updateFileInIndex(folderPath, file.path);
                    var index = RepositoryService.getRepositoryIndex(folderPath);
                    file.index = RepositoryService.getFileIndex(index, file.path);
                    DBService.getItem(file.index).then(function (item) {
                        file.item = item;
                        $mdDialog.hide();
                    });

                }).catch(onError);
            };

        })

        .controller('PartCreationCtrl', function ($scope, $mdDialog,
                                                  WorkspaceService, UploadService, RepositoryService, DBService,
                                                  file, folderPath) {

            $scope.file = file;
            $scope.workspaces = WorkspaceService.workspaces;

            var onError = function (error) {
                $scope.creating = false;
                if (typeof error === 'object' && error.statusText) {
                    $scope.error = error.statusText;
                } else if (typeof error === 'string') {
                    $scope.error = error;
                }
            };

            $scope.close = $mdDialog.hide;

            $scope.create = function () {
                $scope.creating = true;
                $scope.error = null;
                WorkspaceService.createPartInWorkspace($scope.part).then(function (part) {
                    $scope.part = part;
                    RepositoryService.saveItemToIndex(folderPath, file.path, part);
                    return UploadService.uploadNativeCADFile(file.path, part);
                }).then(function () {
                    RepositoryService.updateFileInIndex(folderPath, file.path);
                    var index = RepositoryService.getRepositoryIndex(folderPath);
                    file.index = RepositoryService.getFileIndex(index, file.path);
                    DBService.getItem(file.index).then(function (item) {
                        file.item = item;
                        $mdDialog.hide();
                    });
                }).catch(onError);
            };
        })

        .controller('CheckInCtrl', function ($scope, $mdDialog, $q,
                                             WorkspaceService, UploadService, RepositoryService, DBService,
                                             selection, folderPath) {

            var items = selection.map(function(file){
                return file.item;
            });

            var localChanges = selection.filter(function(file){
                return file.modified;
            });

            var updateItemsNote = function(){
                // todo : use unique selection (same document may be present more than once)
               return WorkspaceService.updateItemNotes(items,$scope.options.note)
                   .then(null, null, function (status) {
                       $scope.status = status;
                   });
            };

            var pushLocalChanges = function(){
                return UploadService.bulkUpload(localChanges, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };

            var checkIn = function(){
                // todo : use unique selection (same document may be present more than once)
                return  WorkspaceService.checkInItems(selection, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };

            $scope.loading = false;
            $scope.selection = selection;
            $scope.folderPath = folderPath;
            $scope.close = $mdDialog.hide;

            $scope.options = {
                pushLocalChanges:true,
                saveNote:true,
                cascadeCheckIn:false
            };

            $scope.checkIn = function () {

                var chain = $q.when();

                if($scope.options.saveNote && $scope.options.note){
                    chain = chain.then(updateItemsNote);
                }

                if($scope.options.pushLocalChanges){
                    chain = chain.then(pushLocalChanges);
                }

                chain.then(checkIn)
                    .then($mdDialog.hide).finally(function () {
                        $scope.loading = false;
                    });
            };

        })

        .controller('CheckOutCtrl', function ($scope, $mdDialog, $filter, $q,
                                              WorkspaceService, DownloadService, RepositoryService,
                                              selection, folderPath) {

            $scope.loading = false;
            $scope.selection = selection;
            $scope.folderPath = folderPath;
            $scope.close = $mdDialog.hide;

            $scope.options = {
                downloadFiles:true,
                cascadeCheckOut:false
            };

            var downloadFiles = function(){

                var fileMap = $filter('itemsFiles')(selection.map(function(file){
                    return file.item;
                }));

                return DownloadService.bulkDownload(fileMap, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };

            var checkOut = function(){
                // todo : use unique selection (same document may be present more than once)
                return  WorkspaceService.checkOutItems(selection, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };

            $scope.checkOut = function () {

                var chain = $q.when();

                if($scope.options.downloadFiles){
                    chain = chain.then(downloadFiles);
                }

                chain.then(checkOut)
                    .then($mdDialog.hide).finally(function () {
                        $scope.loading = false;
                    });
            };

        })

        .controller('UndoCheckOutCtrl', function ($scope, $mdDialog, $filter, $q, DownloadService,
                                                  WorkspaceService, RepositoryService, DBService,
                                                  selection, folderPath) {

            $scope.loading = false;
            $scope.selection = selection;
            $scope.folderPath = folderPath;
            $scope.close = $mdDialog.hide;

            $scope.options = {
                restoreFiles:true
            };

            var restoreFiles = function(){

                var fileMap = $filter('itemsFiles')(selection.map(function(file){
                    return file.item;
                }));

                return DownloadService.bulkDownload(fileMap, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };

            var undoCheckOut = function(){
                return WorkspaceService.undoCheckOutItems(selection, folderPath)
                    .then(null, null, function (status) {
                        $scope.status = status;
                    });
            };


            $scope.undoCheckOut = function () {
                // todo : use unique selection (same document may be present more than once)

                $scope.loading = true;

                var chain = $q.when();

                if($scope.options.restoreFiles){
                    chain = chain.then(restoreFiles);
                }

                chain.then(undoCheckOut)
                    .then($mdDialog.hide).finally(function () {
                        $scope.loading = false;
                    });

            };

        })

        .controller('PushCtrl', function ($scope, $mdDialog,
                                          WorkspaceService, UploadService, RepositoryService, DBService,
                                          selection, folderPath) {

            $scope.loading = false;
            $scope.selection = selection;
            $scope.folderPath = folderPath;
            $scope.close = $mdDialog.hide;

            $scope.push = function () {
                $scope.loading = true;
                UploadService.bulkUpload(selection, folderPath)
                    .then($mdDialog.hide, function (error) {
                        $scope.error = error;
                    }, function (status) {
                        $scope.status = status;
                    }).finally(function () {
                        $scope.loading = false;
                    });
            };

        })

        .controller('DeleteFolderCtrl', function ($scope, $filter, $mdDialog, $location,
                                                  FolderService, NotificationService,
                                                  folder) {

            $scope.close = $mdDialog.hide;

            $scope.confirm = function () {
                FolderService.delete(folder);
                NotificationService.toast($filter('translate')('DELETE_FOLDER_CONFIRMED'));
                $mdDialog.hide();
                $location.path('/');
            };

        });

})();
