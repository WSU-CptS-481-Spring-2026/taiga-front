import { LightboxService } from "../types/lightbox.service";
import { LoadingService } from "../types/loading.service";
import { ModelService } from "../types/model.service";
import { RepoService } from "../types/repo.service";
import { ResourcesService } from "../types/resources.service";

/**
 * Interface for the data passed to the bulk task creation lightbox.
 */
interface TaskCreationData {
    repo: RepoService;
    resources: ResourcesService;
    loading: LoadingService;
    lightboxService: LightboxService;
    model: ModelService;
}

/**
 * Interface for the data passed to the main taskboard controller during bulk task creation.
 */
interface MainCreationData extends TaskCreationData {
    $scope: angular.IScope;
    $rootScope: angular.IRootScopeService;
    $confirm: any; // Assuming this is a service for confirmation dialogs
    $rs: any; // Assuming this is a service for resource management
    $rs2: any; // Assuming this is another service for resource management
    $routeParams: any;
    $q: any;
    $tgAppMetaService: any;
    $tgLocation: any;
    $tgNavUrls: any;
    $tgEvents: any;
    $tgAnalytics: any;
    $translate: any;
    $tgErrorHandlingService: any;
    $tgTaskboardTasks: any;
    $tgTaskboardIssues: any;
    $tgStorage: any;
    $tgFilterRemoteStorageService: any;
    $tgLightboxFactory: any;
    $timeout: any;
    $tgProjectService: any;
    $tgUserService: any;
    $tgTaskboardService: any;
    $tgTaskboardBulkCreationService: any;
    $tgTaskboardBulkCreationValidator: any;
    $tgTaskboardBulkCreationMapper: any;
    $tgTaskboardBulkCreationCreator: any;
    $tgTaskboardBulkCreationUpdater: any;
    $tgTaskboardBulkCreationErrorHandler: any;
}