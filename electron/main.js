const {
    app,
    BrowserWindow,
    ipcMain,
    session,
    shell,
    safeStorage
} = require("electron");

const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

const axios = require("axios");
const cheerio = require("cheerio");


// ============================================================
// CACHE FIX
// ============================================================

// Put Electron/Chromium cache outside the OneDrive project.
// This prevents "Access is denied" cache errors.
const localAppData =
    process.env.LOCALAPPDATA ||
    path.join(
        process.env.USERPROFILE || __dirname,
        "AppData",
        "Local"
    );

const kuroCachePath =
    path.join(
        localAppData,
        "Kuro Anime",
        "Cache"
    );

try {

    fs.mkdirSync(
        kuroCachePath,
        {
            recursive: true
        }
    );

    // Tell Electron where its cache should live.
    app.setPath(
        "cache",
        kuroCachePath
    );

    // Tell Chromium where disk cache should live.
    app.commandLine.appendSwitch(
        "disk-cache-dir",
        kuroCachePath
    );

} catch (error) {

    console.error(
        "Cache setup error:",
        error.message
    );

}

// ============================================================
// CONFIG
// ============================================================

const ANICHI_URL =
    "https://anichi.to";

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/131.0.0.0 Safari/537.36";


// ============================================================
// MYANIMELIST CONFIG
// ============================================================

const MAL_CLIENT_ID =
    "04f03f8ce10b3b9180fc3b931eb08def";

const MAL_API_URL =
    "https://api.myanimelist.net/v2";

const MAL_AUTHORIZE_URL =
    "https://myanimelist.net/v1/oauth2/authorize";

const MAL_TOKEN_URL =
    "https://myanimelist.net/v1/oauth2/token";

const MAL_HOST =
    "127.0.0.1";

const MAL_PORT =
    45678;

const MAL_REDIRECT_URI =
    `http://${MAL_HOST}:${MAL_PORT}/callback`;


// ============================================================
// MAL TOKEN FILE
// ============================================================

function getMalTokenFile() {

    return path.join(
        app.getPath("userData"),
        "mal-token.dat"
    );

}


// ============================================================
// GLOBAL STATE
// ============================================================

let mainWindow =
    null;

let episodeBrowser =
    null;

let malTokens =
    null;

let malServer =
    null;

let malLoginPromise =
    null;


// ============================================================
// ANICHI AXIOS
// ============================================================

const anichiAxios =
    axios.create({

        baseURL:
            ANICHI_URL,

        headers: {

            "User-Agent":
                USER_AGENT,

            "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9," +
                "image/avif,image/webp,image/apng,*/*;q=0.8",

            "Accept-Language":
                "en-US,en;q=0.9",

            "Referer":
                ANICHI_URL + "/"

        },

        timeout:
            20000,

        validateStatus:
            status =>
                status >= 200 &&
                status < 500

    });


// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


function absoluteUrl(url) {

    if (!url) {
        return null;
    }


    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {

        return url;

    }


    if (
        url.startsWith("//")
    ) {

        return "https:" + url;

    }


    if (
        url.startsWith("/")
    ) {

        return ANICHI_URL + url;

    }


    return ANICHI_URL + "/" + url;

}


// ============================================================
// PARSE ANICHI CARDS
// ============================================================

function parseAnimeCards(html) {

    const $ =
        cheerio.load(html);

    const results =
        [];

    const seen =
        new Set();


    $("a[href*='/anime/']").each(
        (_index, element) => {

            const a =
                $(element);

            const href =
                a.attr("href") ||
                "";


            const match =
                href.match(
                    /\/anime\/([^/?#]+)/i
                );


            if (!match) {
                return;
            }


            const id =
                match[1];


            if (
                !id ||
                seen.has(id)
            ) {

                return;

            }


            const img =
                a.find("img").first();


            let title =
                a.find(
                    "h2, h3, .title, .film-name"
                )
                .first()
                .text()
                .trim();


            if (!title) {

                title =
                    a.attr("title") ||
                    "";

            }


            if (!title) {

                title =
                    img.attr("alt") ||
                    "";

            }


            if (!title) {

                title =
                    a.text()
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            }


            if (!title) {

                title =
                    id
                    .replace(
                        /-/g,
                        " "
                    )
                    .replace(
                        /\b\w/g,
                        c =>
                            c.toUpperCase()
                    );

            }


            const image =
                absoluteUrl(
                    img.attr("data-src") ||
                    img.attr("data-original") ||
                    img.attr("src")
                );


            seen.add(id);


            results.push({

                id:
                    id,

                title:
                    title,

                image:
                    image,

                url:
                    `${ANICHI_URL}/anime/${id}`

            });

        }
    );


    return results;

}


// ============================================================
// ANICHI INIT
// ============================================================

ipcMain.handle(
    "anichi-init",
    async () => {

        try {

            const response =
                await anichiAxios.get("/");


            return {

                success:
                    true,

                status:
                    response.status

            };

        } catch (error) {

            console.error(
                "AniChi initialization error:",
                error.message
            );


            return {

                success:
                    false,

                error:
                    error.message

            };

        }

    }
);


// ============================================================
// ANICHI HOME
// ============================================================

ipcMain.handle(
    "anichi-home",
    async () => {

        try {

            const response =
                await anichiAxios.get("/");


            const results =
                parseAnimeCards(
                    response.data
                );


            return {

                success:
                    true,

                data:
                    results.slice(
                        0,
                        30
                    )

            };

        } catch (error) {

            console.error(
                "AniChi home error:",
                error.message
            );


            return {

                success:
                    false,

                error:
                    error.message,

                data:
                    []

            };

        }

    }
);


// ============================================================
// ANICHI CATEGORIES
// ============================================================

const ANICHI_CATEGORY_PATHS = {
    latest: "/latest-updated",
    newRelease: "/new-release",
    upcoming: "/status/not-yet-aired",
    ongoing: "/status/currently-airing",
    completed: "/status/finished-airing",
    popular: "/most-viewed",
    schedule: "/schedule"
};

ipcMain.handle(
    "anichi-category",
    async (_event, category) => {
        try {
            const key =
                String(category || "").trim();

            const categoryPath =
                ANICHI_CATEGORY_PATHS[key];

            if (!categoryPath) {
                return {
                    success: false,
                    error: "Unknown AniChi category.",
                    data: []
                };
            }

            const response =
                await anichiAxios.get(categoryPath);

            return {
                success: true,
                data:
                    parseAnimeCards(
                        response.data
                    ).slice(0, 30)
            };

        } catch (error) {
            console.error(
                "AniChi category error:",
                error.message
            );

            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }
);


// ============================================================
// ANICHI SEARCH
// ============================================================

ipcMain.handle(
    "anichi-search",
    async (
        _event,
        query
    ) => {

        try {

            query =
                String(
                    query || ""
                ).trim();


            if (!query) {

                return {

                    success:
                        false,

                    error:
                        "Search query is empty",

                    data:
                        []

                };

            }


            const response =
                await anichiAxios.get(
                    "/search",
                    {

                        params: {

                            keyword:
                                query

                        }

                    }
                );


            const results =
                parseAnimeCards(
                    response.data
                );


            return {

                success:
                    true,

                data:
                    results.slice(
                        0,
                        30
                    )

            };

        } catch (error) {

            console.error(
                "AniChi search error:",
                error.message
            );


            return {

                success:
                    false,

                error:
                    error.message,

                data:
                    []

            };

        }

    }
);


// ============================================================
// STATIC EPISODE PARSER
// ============================================================

function parseStaticEpisodes(html) {

    const $ =
        cheerio.load(html);

    const episodes =
        [];

    const seen =
        new Set();


    $("a[href*='/watch/']").each(
        (_index, element) => {

            const a =
                $(element);

            const href =
                a.attr("href") ||
                "";


            const match =
                href.match(
                    /\/watch\/([^/]+)\/ep-?(\d+(?:\.\d+)?)/i
                );


            if (!match) {
                return;
            }


            const slug =
                match[1];

            const number =
                Number(
                    match[2]
                );


            const key =
                `${slug}-${number}`;


            if (
                !Number.isFinite(number) ||
                seen.has(key)
            ) {

                return;

            }


            seen.add(key);


            episodes.push({

                number:
                    number,

                title:
                    `Episode ${number}`,

                url:
                    absoluteUrl(
                        href
                    ),

                slug:
                    slug

            });

        }
    );


    return episodes.sort(
        (a, b) =>
            a.number -
            b.number
    );

}


// ============================================================
// RENDERED EPISODE EXTRACTION
// ============================================================

async function getRenderedEpisodes(
    animeId
) {

    return new Promise(
        async resolve => {

            let finished =
                false;

            let timeout =
                null;


            function finish(
                result
            ) {

                if (finished) {
                    return;
                }


                finished =
                    true;


                if (timeout) {

                    clearTimeout(
                        timeout
                    );

                    timeout =
                        null;

                }


                try {

                    if (
                        episodeBrowser &&
                        !episodeBrowser.isDestroyed()
                    ) {

                        episodeBrowser.close();

                    }

                } catch (_) {}


                episodeBrowser =
                    null;


                resolve(
                    Array.isArray(
                        result
                    )
                        ? result
                        : []
                );

            }


            try {

                episodeBrowser =
                    new BrowserWindow({

                        width:
                            1000,

                        height:
                            700,

                        show:
                            false,

                        backgroundColor:
                            "#000000",

                        webPreferences: {

                            nodeIntegration:
                                false,

                            contextIsolation:
                                true,

                            partition:
                                "persist:anichi"

                        }

                    });


                episodeBrowser.webContents
                    .setUserAgent(
                        USER_AGENT
                    );


                const animeUrl =
                    `${ANICHI_URL}/anime/${animeId}`;


                timeout =
                    setTimeout(
                        () => {

                            console.log(
                                "AniChi episode render timeout"
                            );


                            finish([]);

                        },
                        20000
                    );


                episodeBrowser.webContents.once(
                    "did-finish-load",
                    async () => {

                        try {

                            await sleep(
                                4000
                            );


                            if (
                                !episodeBrowser ||
                                episodeBrowser.isDestroyed()
                            ) {

                                finish([]);

                                return;

                            }


                            const links =
                                await episodeBrowser
                                    .webContents
                                    .executeJavaScript(`

                                        Array.from(
                                            document.querySelectorAll(
                                                'a[href*="/watch/"]'
                                            )
                                        ).map(
                                            element => ({
                                                href:
                                                    element.href,

                                                text:
                                                    element.innerText ||
                                                    element.textContent ||
                                                    ""
                                            })
                                        );

                                    `);


                            const episodes =
                                [];

                            const seen =
                                new Set();


                            for (
                                const item of
                                (
                                    Array.isArray(
                                        links
                                    )
                                        ? links
                                        : []
                                )
                            ) {

                                if (
                                    !item ||
                                    !item.href
                                ) {

                                    continue;

                                }


                                const href =
                                    String(
                                        item.href
                                    );


                                const match =
                                    href.match(
                                        /\/watch\/([^/]+)\/ep-?(\d+(?:\.\d+)?)/i
                                    );


                                if (!match) {
                                    continue;
                                }


                                const slug =
                                    match[1];

                                const number =
                                    Number(
                                        match[2]
                                    );


                                const key =
                                    `${slug}-${number}`;


                                if (
                                    !Number.isFinite(
                                        number
                                    ) ||
                                    seen.has(key)
                                ) {

                                    continue;

                                }


                                seen.add(key);


                                episodes.push({

                                    number:
                                        number,

                                    title:
                                        `Episode ${number}`,

                                    url:
                                        href,

                                    slug:
                                        slug

                                });

                            }


                            episodes.sort(
                                (a, b) =>
                                    a.number -
                                    b.number
                            );


                            console.log(
                                "Rendered AniChi episodes:",
                                episodes.length
                            );


                            finish(
                                episodes
                            );


                        } catch (error) {

                            console.error(
                                "Episode extraction error:",
                                error.message
                            );


                            finish([]);

                        }

                    }
                );


                episodeBrowser.webContents.on(
                    "did-fail-load",
                    (
                        event,
                        errorCode,
                        errorDescription,
                        validatedURL,
                        isMainFrame
                    ) => {

                        if (
                            !isMainFrame
                        ) {

                            return;

                        }


                        console.error(
                            "AniChi episode page failed:",
                            errorCode,
                            errorDescription,
                            validatedURL
                        );


                        finish([]);

                    }
                );


                episodeBrowser.loadURL(
                    animeUrl,
                    {
                        userAgent:
                            USER_AGENT
                    }
                );


            } catch (error) {

                console.error(
                    "Could not create episode browser:",
                    error.message
                );


                finish([]);

            }

        }
    );

}


// ============================================================
// ANICHI EPISODES
// ============================================================

ipcMain.handle(
    "anichi-episodes",
    async (
        _event,
        animeId
    ) => {

        try {

            animeId =
                String(
                    animeId || ""
                ).trim();


            if (!animeId) {

                return {

                    success:
                        false,

                    error:
                        "Anime ID is missing",

                    data:
                        []

                };

            }


            const rendered =
                await getRenderedEpisodes(
                    animeId
                );


            if (
                rendered.length
            ) {

                console.log(
                    "Using rendered AniChi episodes:",
                    rendered.length
                );


                return {

                    success:
                        true,

                    data:
                        rendered

                };

            }


            const response =
                await anichiAxios.get(
                    `/anime/${animeId}`
                );


            const fallback =
                parseStaticEpisodes(
                    response.data
                );


            return {

                success:
                    true,

                data:
                    fallback

            };

        } catch (error) {

            console.error(
                "AniChi episode error:",
                error.message
            );


            return {

                success:
                    false,

                error:
                    error.message,

                data:
                    []

            };

        }

    }
);


// ============================================================
// MAL TOKEN FUNCTIONS
// ============================================================

function generatePkceVerifier() {

    return crypto
        .randomBytes(64)
        .toString("base64url")
        .slice(0, 86);

}


function generateState() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


// ============================================================
// LOAD MAL TOKENS
// ============================================================

function loadMalTokens() {

    if (malTokens) {
        return malTokens;
    }


    try {

        const file =
            getMalTokenFile();


        if (
            !fs.existsSync(file)
        ) {

            return null;

        }


        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );


        if (
            safeStorage.isEncryptionAvailable()
        ) {

            const decrypted =
                safeStorage.decryptString(
                    Buffer.from(
                        raw,
                        "base64"
                    )
                );


            malTokens =
                JSON.parse(
                    decrypted
                );

        } else {

            malTokens =
                JSON.parse(
                    raw
                );

        }


        return malTokens;

    } catch (error) {

        console.error(
            "MAL token load error:",
            error.message
        );


        malTokens =
            null;


        return null;

    }

}


// ============================================================
// SAVE MAL TOKENS
// ============================================================

function saveMalTokens(
    tokens
) {

    malTokens =
        tokens;


    const file =
        getMalTokenFile();


    fs.mkdirSync(
        path.dirname(file),
        {
            recursive:
                true
        }
    );


    const json =
        JSON.stringify(
            tokens
        );


    if (
        safeStorage.isEncryptionAvailable()
    ) {

        const encrypted =
            safeStorage.encryptString(
                json
            );


        fs.writeFileSync(
            file,
            encrypted.toString(
                "base64"
            ),
            "utf8"
        );

    } else {

        fs.writeFileSync(
            file,
            json,
            {
                encoding:
                    "utf8",

                mode:
                    0o600

            }
        );

    }

}


// ============================================================
// CLEAR MAL TOKENS
// ============================================================

function clearMalTokens() {

    malTokens =
        null;


    try {

        fs.rmSync(
            getMalTokenFile(),
            {
                force:
                    true
            }
        );

    } catch (_) {}

}


// ============================================================
// REFRESH MAL TOKEN
// ============================================================

async function refreshMalAccessToken() {

    const tokens =
        loadMalTokens();


    if (
        !tokens ||
        !tokens.refresh_token
    ) {

        return false;

    }


    try {

        const body =
            new URLSearchParams({

                client_id:
                    MAL_CLIENT_ID,

                grant_type:
                    "refresh_token",

                refresh_token:
                    tokens.refresh_token

            });


        const response =
            await axios.post(

                MAL_TOKEN_URL,

                body.toString(),

                {

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    timeout:
                        20000

                }

            );


        saveMalTokens({

            ...tokens,

            ...response.data,

            expires_at:
                Date.now() +
                Number(
                    response.data.expires_in ||
                    3600
                ) *
                1000

        });


        return true;

    } catch (error) {

        console.error(
            "MAL token refresh error:",
            error.response?.data ||
            error.message
        );


        return false;

    }

}


// ============================================================
// GET VALID MAL TOKEN
// ============================================================

async function getValidMalAccessToken() {

    const tokens =
        loadMalTokens();


    if (
        !tokens ||
        !tokens.access_token
    ) {

        return null;

    }


    if (
        !tokens.expires_at ||
        Date.now() <
        tokens.expires_at -
        60000
    ) {

        return tokens.access_token;

    }


    if (
        await refreshMalAccessToken()
    ) {

        return malTokens.access_token;

    }


    return null;

}


// ============================================================
// MAL API REQUEST
// ============================================================

async function malRequest(
    method,
    endpoint,
    options = {},
    retry = true
) {

    const token =
        await getValidMalAccessToken();


    const headers = {

        Accept:
            "application/json",

        "X-MAL-CLIENT-ID":
            MAL_CLIENT_ID,

        ...(options.headers || {})

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    try {

        return await axios({

            method:
                method,

            url:
                endpoint.startsWith(
                    "http"
                )
                    ? endpoint
                    : MAL_API_URL +
                      endpoint,

            params:
                options.params,

            data:
                options.data,

            headers:
                headers,

            timeout:
                20000

        });

    } catch (error) {

        if (
            retry &&
            error.response?.status === 401 &&
            loadMalTokens()?.refresh_token
        ) {

            const refreshed =
                await refreshMalAccessToken();


            if (refreshed) {

                return malRequest(
                    method,
                    endpoint,
                    options,
                    false
                );

            }

        }


        throw error;

    }

}


// ============================================================
// MAL TITLE NORMALIZATION
// ============================================================

function normalizeTitle(
    title
) {

    return String(
        title || ""
    )
    .toLowerCase()
    .replace(
        /[^a-z0-9]+/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


// ============================================================
// MAL TITLE SIMILARITY
// ============================================================

function titleSimilarity(
    a,
    b
) {

    const x =
        normalizeTitle(a);

    const y =
        normalizeTitle(b);


    if (
        !x ||
        !y
    ) {

        return 0;

    }


    if (
        x === y
    ) {

        return 1;

    }


    if (
        x.includes(y) ||
        y.includes(x)
    ) {

        return 0.9;

    }


    const A =
        new Set(
            x.split(" ")
        );


    const B =
        new Set(
            y.split(" ")
        );


    const intersection =
        [...A].filter(
            word =>
                B.has(word)
        ).length;


    return (
        intersection /
        Math.max(
            A.size,
            B.size
        )
    );

}


// ============================================================
// MAL LOGIN
// ============================================================

async function startMalLogin() {

    if (malLoginPromise) {

        return malLoginPromise;

    }


    const verifier =
        generatePkceVerifier();

    const state =
        generateState();


    malLoginPromise =
        new Promise(
            (resolve, reject) => {

                let finished =
                    false;


                function finish(
                    error,
                    result
                ) {

                    if (finished) {
                        return;
                    }


                    finished =
                        true;


                    try {

                        if (
                            malServer
                        ) {

                            malServer.close();

                        }

                    } catch (_) {}


                    malServer =
                        null;


                    malLoginPromise =
                        null;


                    if (error) {

                        reject(
                            error
                        );

                    } else {

                        resolve(
                            result
                        );

                    }

                }


                malServer =
                    http.createServer(
                        async (
                            req,
                            res
                        ) => {

                            try {

                                const requestUrl =
                                    new URL(
                                        req.url,
                                        MAL_REDIRECT_URI
                                    );


                                if (
                                    requestUrl.pathname !==
                                    "/callback"
                                ) {

                                    res.writeHead(
                                        404
                                    );

                                    res.end(
                                        "Not found"
                                    );

                                    return;

                                }


                                const returnedState =
                                    requestUrl
                                    .searchParams
                                    .get(
                                        "state"
                                    );


                                const code =
                                    requestUrl
                                    .searchParams
                                    .get(
                                        "code"
                                    );


                                const oauthError =
                                    requestUrl
                                    .searchParams
                                    .get(
                                        "error"
                                    );


                                if (
                                    returnedState !==
                                    state
                                ) {

                                    throw new Error(
                                        "Invalid MAL OAuth state."
                                    );

                                }


                                if (
                                    oauthError
                                ) {

                                    throw new Error(
                                        oauthError
                                    );

                                }


                                if (!code) {

                                    throw new Error(
                                        "No authorization code."
                                    );

                                }


                                const body =
                                    new URLSearchParams({

                                        client_id:
                                            MAL_CLIENT_ID,

                                        grant_type:
                                            "authorization_code",

                                        code:
                                            code,

                                        redirect_uri:
                                            MAL_REDIRECT_URI,

                                        code_verifier:
                                            verifier

                                    });


                                const tokenResponse =
                                    await axios.post(

                                        MAL_TOKEN_URL,

                                        body.toString(),

                                        {

                                            headers: {

                                                "Content-Type":
                                                    "application/x-www-form-urlencoded"

                                            },

                                            timeout:
                                                20000

                                        }

                                    );


                                saveMalTokens({

                                    ...tokenResponse.data,

                                    expires_at:
                                        Date.now() +
                                        Number(
                                            tokenResponse
                                            .data
                                            .expires_in ||
                                            3600
                                        ) *
                                        1000

                                });


                                res.writeHead(
                                    200,
                                    {
                                        "Content-Type":
                                            "text/html; charset=utf-8"
                                    }
                                );


                                res.end(`

<!DOCTYPE html>

<html>

<head>

<title>Kuro Anime</title>

</head>

<body style="
    margin:0;
    background:#0b0b0f;
    color:white;
    font-family:Arial,Helvetica,sans-serif;
    display:flex;
    align-items:center;
    justify-content:center;
    min-height:100vh;
    text-align:center;
">

<div>

<h2 style="
    color:#9b5cff;
">
Kuro Anime
</h2>

<p>
MyAnimeList login successful.
</p>

<p style="
    color:#888;
">
You can close this tab and return to Kuro Anime.
</p>

</div>

</body>

</html>

`);


                                const me =
                                    await malRequest(
                                        "GET",
                                        "/users/@me"
                                    );


                                finish(
                                    null,
                                    {

                                        success:
                                            true,

                                        loggedIn:
                                            true,

                                        user:
                                            me.data

                                    }
                                );


                            } catch (error) {

                                console.error(
                                    "MAL callback error:",
                                    error.response?.data ||
                                    error.message
                                );


                                try {

                                    res.writeHead(
                                        400,
                                        {
                                            "Content-Type":
                                                "text/html"
                                        }
                                    );


                                    res.end(`
                                        <h2>
                                            Kuro Anime:
                                            MAL login failed.
                                        </h2>

                                        <p>
                                            You can close this tab.
                                        </p>
                                    `);

                                } catch (_) {}


                                finish(
                                    error
                                );

                            }

                        }
                    );


                malServer.once(
                    "error",
                    error => {

                        finish(
                            error
                        );

                    }
                );


                malServer.listen(
                    MAL_PORT,
                    MAL_HOST,
                    async () => {

                        const authUrl =
                            new URL(
                                MAL_AUTHORIZE_URL
                            );


                        authUrl.searchParams.set(
                            "response_type",
                            "code"
                        );


                        authUrl.searchParams.set(
                            "client_id",
                            MAL_CLIENT_ID
                        );


                        authUrl.searchParams.set(
                            "redirect_uri",
                            MAL_REDIRECT_URI
                        );


                        authUrl.searchParams.set(
                            "code_challenge",
                            verifier
                        );


                        authUrl.searchParams.set(
                            "code_challenge_method",
                            "plain"
                        );


                        authUrl.searchParams.set(
                            "state",
                            state
                        );


                        try {

                            await shell.openExternal(
                                authUrl.toString()
                            );

                        } catch (error) {

                            finish(
                                error
                            );

                        }

                    }
                );


                setTimeout(
                    () => {

                        if (!finished) {

                            finish(
                                new Error(
                                    "MAL login timed out."
                                )
                            );

                        }

                    },
                    5 * 60 * 1000
                );

            }
        );


    return malLoginPromise;

}


// ============================================================
// MAL STATUS
// ============================================================

ipcMain.handle(
    "mal-status",
    async () => {

        const token =
            await getValidMalAccessToken();


        if (!token) {

            return {

                success:
                    true,

                loggedIn:
                    false

            };

        }


        try {

            const response =
                await malRequest(
                    "GET",
                    "/users/@me"
                );


            return {

                success:
                    true,

                loggedIn:
                    true,

                user:
                    response.data

            };

        } catch (error) {

            return {

                success:
                    false,

                loggedIn:
                    false,

                error:
                    error.response?.data?.message ||
                    error.message

            };

        }

    }
);


// ============================================================
// MAL LOGIN IPC
// ============================================================

ipcMain.handle(
    "mal-login",
    async () => {

        try {

            return await startMalLogin();

        } catch (error) {

            return {

                success:
                    false,

                loggedIn:
                    false,

                error:
                    error.message

            };

        }

    }
);


// ============================================================
// MAL LOGOUT IPC
// ============================================================

ipcMain.handle(
    "mal-logout",
    () => {

        clearMalTokens();


        return {

            success:
                true

        };

    }
);


// ============================================================
// MAL SEARCH
// ============================================================

ipcMain.handle(
    "mal-search-anime",
    async (
        _event,
        query
    ) => {

        try {

            query =
                String(
                    query || ""
                ).trim();


            if (
                query.length < 3
            ) {

                throw new Error(
                    "MAL search requires at least 3 characters."
                );

            }


            const response =
                await malRequest(
                    "GET",
                    "/anime",
                    {

                        params: {

                            q:
                                query,

                            limit:
                                5,

                            fields:
                                "id,title,main_picture,mean,num_episodes,status,media_type,start_date,end_date,synopsis,genres"

                        }

                    }
                );


            return {

                success:
                    true,

                data:
                    response.data.data ||
                    []

            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    error.response?.data?.message ||
                    error.message,

                data:
                    []

            };

        }

    }
);


// ============================================================
// MAL LINK ANIME
// ============================================================

ipcMain.handle(
    "mal-link-anime",
    async (
        _event,
        title
    ) => {

        try {

            title =
                String(
                    title || ""
                ).trim();


            if (
                title.length < 3
            ) {

                throw new Error(
                    "Anime title is too short."
                );

            }


            const response =
                await malRequest(
                    "GET",
                    "/anime",
                    {

                        params: {

                            q:
                                title,

                            limit:
                                5,

                            fields:
                                "id,title,main_picture,mean,num_episodes,status,media_type,start_date,end_date,synopsis,genres"

                        }

                    }
                );


            const results =
                response.data.data ||
                [];


            if (
                !results.length
            ) {

                return {

                    success:
                        false,

                    error:
                        "Anime not found on MyAnimeList.",

                    data:
                        []

                };

            }


            const best =
                [...results].sort(
                    (a, b) =>
                        titleSimilarity(
                            title,
                            b.node?.title
                        ) -
                        titleSimilarity(
                            title,
                            a.node?.title
                        )
                )[0];


            const malId =
                best?.node?.id;


            if (!malId) {

                throw new Error(
                    "Invalid MAL anime result."
                );

            }


            const detail =
                await malRequest(
                    "GET",
                    `/anime/${malId}`,
                    {

                        params: {

                            fields:
                                "id,title,main_picture,alternative_titles,mean,rank,popularity,num_episodes,status,media_type,start_date,end_date,synopsis,genres,my_list_status"

                        }

                    }
                );


            return {

                success:
                    true,

                data:
                    detail.data,

                confidence:
                    titleSimilarity(
                        title,
                        detail.data.title
                    )

            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    error.response?.data?.message ||
                    error.message

            };

        }

    }
);


// ============================================================
// GET MAL ANIME
// ============================================================

ipcMain.handle(
    "mal-get-anime",
    async (
        _event,
        malId
    ) => {

        try {

            const id =
                Number(
                    malId
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                throw new Error(
                    "Invalid MAL anime ID."
                );

            }


            const response =
                await malRequest(
                    "GET",
                    `/anime/${id}`,
                    {

                        params: {

                            fields:
                                "id,title,main_picture,alternative_titles,mean,rank,popularity,num_episodes,status,media_type,start_date,end_date,synopsis,genres,my_list_status"

                        }

                    }
                );


            return {

                success:
                    true,

                data:
                    response.data

            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    error.response?.data?.message ||
                    error.message

            };

        }

    }
);


// ============================================================
// UPDATE MAL
// ============================================================

ipcMain.handle(
    "mal-update-anime",
    async (
        _event,
        malId,
        update
    ) => {

        try {

            const id =
                Number(
                    malId
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                throw new Error(
                    "Invalid MAL anime ID."
                );

            }


            const body =
                new URLSearchParams();


            const allowedFields = [

                "status",

                "score",

                "num_watched_episodes"

            ];


            for (
                const key of
                allowedFields
            ) {

                if (
                    update &&
                    update[key] !== undefined &&
                    update[key] !== null
                ) {

                    body.set(
                        key,
                        String(
                            update[key]
                        )
                    );

                }

            }


            const response =
                await malRequest(
                    "PATCH",
                    `/anime/${id}/my_list_status`,
                    {

                        data:
                            body.toString(),

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded"

                        }

                    }
                );


            return {

                success:
                    true,

                data:
                    response.data

            };

        } catch (error) {

            console.error(
                "MAL update error:",
                error.response?.data ||
                error.message
            );


            return {

                success:
                    false,

                error:
                    error.response?.data?.message ||
                    error.message

            };

        }

    }
);


// ============================================================
// MAL REMOVE FROM LIST
// ============================================================

ipcMain.handle(
    "mal-remove-anime",
    async (_event, malId) => {
        try {
            const id =
                Number(malId);

            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {
                throw new Error(
                    "Invalid MAL anime ID."
                );
            }

            await malRequest(
                "DELETE",
                `/anime/${id}/my_list_status`
            );

            return {
                success: true
            };

        } catch (error) {
            console.error(
                "MAL remove error:",
                error.response?.data ||
                error.message
            );

            return {
                success: false,
                error:
                    error.response?.data?.message ||
                    error.message
            };
        }
    }
);


// ============================================================
// OPEN EXTERNAL
// ============================================================

ipcMain.handle(
    "open-external",
    async (_event, url) => {
        const value =
            String(url || "").trim();

        if (!/^https?:\/\//i.test(value)) {
            throw new Error(
                "Invalid external URL."
            );
        }

        await shell.openExternal(value);

        return true;
    }
);


// ============================================================
// FULLSCREEN
// ============================================================

ipcMain.handle(
    "toggle-fullscreen",
    () => {

        if (
            !mainWindow ||
            mainWindow.isDestroyed()
        ) {

            return false;

        }


        const next =
            !mainWindow.isFullScreen();


        mainWindow.setFullScreen(
            next
        );


        return next;

    }
);


ipcMain.handle(
    "is-fullscreen",
    () => {

        return !!(
            mainWindow &&
            !mainWindow.isDestroyed() &&
            mainWindow.isFullScreen()
        );

    }
);


// ============================================================
// CREATE MAIN WINDOW
// ============================================================

function createMainWindow() {

    mainWindow =
        new BrowserWindow({

            width:
                1400,

            height:
                850,

            minWidth:
                1000,

            minHeight:
                650,

            backgroundColor:
                "#0b0b0f",

            title:
                "Kuro Anime",

            webPreferences: {

                nodeIntegration:
                    false,

                contextIsolation:
                    true,

                preload:
                    path.join(
                        __dirname,
                        "preload.js"
                    ),

                webviewTag:
                    true

            }

        });


    mainWindow.loadFile(
        path.join(
            __dirname,
            "index.html"
        )
    );


   // ========================================================
// PLAYER-ONLY F11 / ESC
// ========================================================

mainWindow.webContents.on(
    "before-input-event",
    (
        event,
        input
    ) => {

        if (
            input.type !==
            "keyDown"
        ) {
            return;
        }

        // F11 = player-only fullscreen
        if (
            input.key ===
            "F11"
        ) {

            event.preventDefault();

            mainWindow.webContents.send(
                "player-fullscreen-toggle"
            );

            return;
        }

        // ESC = exit player-only fullscreen
        if (
            input.key ===
            "Escape"
        ) {

            event.preventDefault();

            mainWindow.webContents.send(
                "player-fullscreen-exit"
            );

        }

    }
);


// ========================================================
// F11 / ESC FROM ANICHI WEBVIEW
// ========================================================

mainWindow.webContents.on(
    "did-attach-webview",
    (
        _event,
        guestContents
    ) => {

        guestContents.on(
            "before-input-event",
            (
                event,
                input
            ) => {

                if (
                    input.type !==
                    "keyDown"
                ) {
                    return;
                }

                // F11 while AniChi player has focus
                if (
                    input.key ===
                    "F11"
                ) {

                    event.preventDefault();

                    mainWindow.webContents.send(
                        "player-fullscreen-toggle"
                    );

                    return;
                }

                // ESC while AniChi player has focus
                if (
                    input.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    mainWindow.webContents.send(
                        "player-fullscreen-exit"
                    );

                }

            }
        );

    }
);

    // ========================================================
    // FULLSCREEN EVENTS
    // ========================================================

    mainWindow.on(
        "enter-full-screen",
        () => {

            if (
                mainWindow &&
                !mainWindow.isDestroyed()
            ) {

                mainWindow.webContents.send(
                    "fullscreen-changed",
                    true
                );

            }

        }
    );


    mainWindow.on(
        "leave-full-screen",
        () => {

            if (
                mainWindow &&
                !mainWindow.isDestroyed()
            ) {

                mainWindow.webContents.send(
                    "fullscreen-changed",
                    false
                );

            }

        }
    );


    // ========================================================
    // CLOSE
    // ========================================================

    mainWindow.on(
        "closed",
        () => {

            mainWindow =
                null;

        }
    );

}


// ============================================================
// APP READY
// ============================================================

app.whenReady().then(
    async () => {

        // ========================================================
        // ANICHI SESSION
        // ========================================================

        try {

            const anichiSession =
                session.fromPartition(
                    "persist:anichi"
                );


            anichiSession.setUserAgent(
                USER_AGENT
            );


            console.log(
                "AniChi session initialized."
            );


            console.log(
                "Electron cache:",
                app.getPath("cache")
            );


        } catch (error) {

            console.error(
                "AniChi session error:",
                error.message
            );

        }


        // ========================================================
        // CREATE KURO ANIME
        // ========================================================

        createMainWindow();


        // ========================================================
        // ACTIVATE
        // ========================================================

        app.on(
            "activate",
            () => {

                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {

                    createMainWindow();

                }

            }
        );

    }
);


// ============================================================
// WINDOW ALL CLOSED
// ============================================================

app.on(
    "window-all-closed",
    () => {

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();

        }

    }
);


// ============================================================
// CLEANUP
// ============================================================

app.on(
    "before-quit",
    () => {

        try {

            if (
                episodeBrowser &&
                !episodeBrowser.isDestroyed()
            ) {

                episodeBrowser.close();

            }

        } catch (_) {}


        episodeBrowser =
            null;


        try {

            if (
                malServer
            ) {

                malServer.close();

            }

        } catch (_) {}


        malServer =
            null;

    }
);