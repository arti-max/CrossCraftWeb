
export interface LevelLoaderListener {
    beginLevelLoading(title: string): void;
    levelLoadUpdate(status: string): void;
}