const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kuroAPI", {

    // AniChi
    initAniChi: () =>
        ipcRenderer.invoke("anichi-init"),

    getHome: () =>
        ipcRenderer.invoke("anichi-home"),

    search: query =>
        ipcRenderer.invoke(
            "anichi-search",
            query
        ),

    getEpisodes: id =>
        ipcRenderer.invoke(
            "anichi-episodes",
            id
        ),

    getCategory: category =>
        ipcRenderer.invoke(
            "anichi-category",
            category
        ),


    // MyAnimeList
    malStatus: () =>
        ipcRenderer.invoke(
            "mal-status"
        ),

    malLogin: () =>
        ipcRenderer.invoke(
            "mal-login"
        ),

    malLogout: () =>
        ipcRenderer.invoke(
            "mal-logout"
        ),

    malSearchAnime: query =>
        ipcRenderer.invoke(
            "mal-search-anime",
            query
        ),

    malLinkAnime: title =>
        ipcRenderer.invoke(
            "mal-link-anime",
            title
        ),

    malGetAnime: id =>
        ipcRenderer.invoke(
            "mal-get-anime",
            id
        ),

    malUpdateAnime: (id, update) =>
        ipcRenderer.invoke(
            "mal-update-anime",
            id,
            update
        ),

    malRemoveAnime: id =>
        ipcRenderer.invoke(
            "mal-remove-anime",
            id
        ),


    // External links
    openExternal: url =>
        ipcRenderer.invoke(
            "open-external",
            url
        ),


    // Player-only fullscreen
    onPlayerFullscreenToggle:
        callback =>
            ipcRenderer.on(
                "player-fullscreen-toggle",
                () => callback()
            ),

    onPlayerFullscreenExit:
        callback =>
            ipcRenderer.on(
                "player-fullscreen-exit",
                () => callback()
            ),


    // Compatibility
    toggleFullscreen: () =>
        ipcRenderer.invoke(
            "toggle-fullscreen"
        ),

    isFullscreen: () =>
        ipcRenderer.invoke(
            "is-fullscreen"
        ),

    onFullscreenChanged:
        callback =>
            ipcRenderer.on(
                "fullscreen-changed",
                (_, value) =>
                    callback(value)
            )
});
