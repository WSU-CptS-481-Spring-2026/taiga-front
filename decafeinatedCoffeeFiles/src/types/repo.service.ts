/**
 * Placeholder interface for refactoring .coffee files into modern JS framework.
 * Can be extended as needed.
 */
export interface RepoService {
    getRepoUrl(): string;
    getRepoType(): string;
    getRepoName(): string;
    getRepoId(): number;
}