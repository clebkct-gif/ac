const CACHE_NAME = 'oratorio-v2';

// Arquivos que devem estar disponíveis desde a instalação.
// Inclua aqui somente arquivos que já existem.
const PRECACHE_FILES = [
    './',
    './index.html',
    './manifest.json',
    './iniciar.png',
    './520821.png',
    './open-book.mp3',
    './close-book.mp3'
];

// Instalação
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                const urls = PRECACHE_FILES.map(
                    file => new URL(file, self.registration.scope).href
                );
                return cache.addAll(urls);
            })
            .then(() => self.skipWaiting())
    );
});

// Ativação
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key =>
                        key.startsWith('oratorio-') &&
                        key !== CACHE_NAME
                    )
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Interceptação das requisições
self.addEventListener('fetch', event => {

    const request = event.request;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Somente arquivos do próprio aplicativo
    if (
        url.origin !== self.location.origin ||
        !url.href.startsWith(self.registration.scope)
    ) return;

    // Páginas HTML: tenta acessar a internet primeiro
    if (request.mode === 'navigate') {

        event.respondWith((async () => {

            try {
                const response = await fetch(request);

                if (response.ok && response.type === 'basic') {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }

                return response;

            } catch (error) {

                const cached = await caches.match(request);

                if (cached) return cached;

                return new Response(
                    'Esta página ainda não foi armazenada para uso offline.',
                    {
                        status: 503,
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8'
                        }
                    }
                );
            }

        })());

        return;
    }

    // Imagens, CSS, JavaScript, áudios e outros recursos
    event.respondWith((async () => {

        const cached = await caches.match(request);

        if (cached) return cached;

        try {
            const response = await fetch(request);

            if (response.ok && response.type === 'basic') {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }

            return response;

        } catch (error) {

            return new Response('', { status: 503 });

        }

    })());

});
