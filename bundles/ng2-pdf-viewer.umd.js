(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('rxjs'), require('rxjs/operators'), require('pdfjs-dist/build/pdf'), require('pdfjs-dist/web/pdf_viewer')) :
    typeof define === 'function' && define.amd ? define('ng2-pdf-viewer', ['exports', '@angular/core', 'rxjs', 'rxjs/operators', 'pdfjs-dist/build/pdf', 'pdfjs-dist/web/pdf_viewer'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['ng2-pdf-viewer'] = {}, global.ng.core, global.rxjs, global.rxjs.operators, global.PDFJS, global.PDFJSViewer));
}(this, (function (exports, core, rxjs, operators, PDFJS, PDFJSViewer) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () {
                            return e[k];
                        }
                    });
                }
            });
        }
        n['default'] = e;
        return Object.freeze(n);
    }

    var PDFJS__namespace = /*#__PURE__*/_interopNamespace(PDFJS);
    var PDFJSViewer__namespace = /*#__PURE__*/_interopNamespace(PDFJSViewer);

    function createEventBus(pdfJsViewer, destroy$) {
        var globalEventBus = new pdfJsViewer.EventBus();
        attachDOMEventsToEventBus(globalEventBus, destroy$);
        return globalEventBus;
    }
    function attachDOMEventsToEventBus(eventBus, destroy$) {
        rxjs.fromEvent(eventBus, 'documentload')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function () {
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('documentload', true, true, {});
            window.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'pagerendered')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var pageNumber = _a.pageNumber, cssTransform = _a.cssTransform, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('pagerendered', true, true, {
                pageNumber: pageNumber,
                cssTransform: cssTransform,
            });
            source.div.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'textlayerrendered')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var pageNumber = _a.pageNumber, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('textlayerrendered', true, true, { pageNumber: pageNumber });
            source.textLayerDiv.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'pagechanging')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var pageNumber = _a.pageNumber, source = _a.source;
            var event = document.createEvent('UIEvents');
            event.initEvent('pagechanging', true, true);
            /* tslint:disable:no-string-literal */
            event['pageNumber'] = pageNumber;
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'pagesinit')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('pagesinit', true, true, null);
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'pagesloaded')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var pagesCount = _a.pagesCount, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('pagesloaded', true, true, { pagesCount: pagesCount });
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'scalechange')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var scale = _a.scale, presetValue = _a.presetValue, source = _a.source;
            var event = document.createEvent('UIEvents');
            event.initEvent('scalechange', true, true);
            /* tslint:disable:no-string-literal */
            event['scale'] = scale;
            /* tslint:disable:no-string-literal */
            event['presetValue'] = presetValue;
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'updateviewarea')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var location = _a.location, source = _a.source;
            var event = document.createEvent('UIEvents');
            event.initEvent('updateviewarea', true, true);
            event['location'] = location;
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'find')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var source = _a.source, type = _a.type, query = _a.query, phraseSearch = _a.phraseSearch, caseSensitive = _a.caseSensitive, highlightAll = _a.highlightAll, findPrevious = _a.findPrevious;
            if (source === window) {
                return; // event comes from FirefoxCom, no need to replicate
            }
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('find' + type, true, true, {
                query: query,
                phraseSearch: phraseSearch,
                caseSensitive: caseSensitive,
                highlightAll: highlightAll,
                findPrevious: findPrevious,
            });
            window.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'attachmentsloaded')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var attachmentsCount = _a.attachmentsCount, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('attachmentsloaded', true, true, {
                attachmentsCount: attachmentsCount,
            });
            source.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'sidebarviewchanged')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var view = _a.view, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('sidebarviewchanged', true, true, { view: view });
            source.outerContainer.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'pagemode')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var mode = _a.mode, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('pagemode', true, true, { mode: mode });
            source.pdfViewer.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'namedaction')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var action = _a.action, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('namedaction', true, true, { action: action });
            source.pdfViewer.container.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'presentationmodechanged')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var active = _a.active, switchInProgress = _a.switchInProgress;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('presentationmodechanged', true, true, {
                active: active,
                switchInProgress: switchInProgress,
            });
            window.dispatchEvent(event);
        });
        rxjs.fromEvent(eventBus, 'outlineloaded')
            .pipe(operators.takeUntil(destroy$))
            .subscribe(function (_a) {
            var outlineCount = _a.outlineCount, source = _a.source;
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('outlineloaded', true, true, { outlineCount: outlineCount });
            source.container.dispatchEvent(event);
        });
    }

    function assign(obj, prop, value) {
        obj[prop] = value;
    }
    function isSSR() {
        return typeof window === 'undefined';
    }

    /**
     * Created by vadimdez on 21/06/16.
     */
    if (!isSSR()) {
        assign(PDFJS__namespace, "verbosity", PDFJS__namespace.VerbosityLevel.ERRORS);
    }
    exports.RenderTextMode = void 0;
    (function (RenderTextMode) {
        RenderTextMode[RenderTextMode["DISABLED"] = 0] = "DISABLED";
        RenderTextMode[RenderTextMode["ENABLED"] = 1] = "ENABLED";
        RenderTextMode[RenderTextMode["ENHANCED"] = 2] = "ENHANCED";
    })(exports.RenderTextMode || (exports.RenderTextMode = {}));
    var PdfViewerComponent = /** @class */ (function () {
        function PdfViewerComponent(element) {
            this.element = element;
            this.isVisible = false;
            this._cMapsUrl = typeof PDFJS__namespace !== 'undefined'
                ? "https://unpkg.com/pdfjs-dist@" + PDFJS__namespace.version + "/cmaps/"
                : null;
            this._renderText = true;
            this._renderTextMode = exports.RenderTextMode.ENABLED;
            this._stickToPage = false;
            this._originalSize = true;
            this._page = 1;
            this._zoom = 1;
            this._zoomScale = 'page-width';
            this._rotation = 0;
            this._showAll = true;
            this._canAutoResize = true;
            this._fitToPage = false;
            this._externalLinkTarget = 'blank';
            this._showBorders = false;
            this.isInitialized = false;
            this.destroy$ = new rxjs.Subject();
            this.afterLoadComplete = new core.EventEmitter();
            this.pageRendered = new core.EventEmitter();
            this.pageInitialized = new core.EventEmitter();
            this.textLayerRendered = new core.EventEmitter();
            this.onError = new core.EventEmitter();
            this.onProgress = new core.EventEmitter();
            this.pageChange = new core.EventEmitter(true);
            if (isSSR()) {
                return;
            }
            var pdfWorkerSrc;
            if (window.hasOwnProperty('pdfWorkerSrc') &&
                typeof window.pdfWorkerSrc === 'string' &&
                window.pdfWorkerSrc) {
                pdfWorkerSrc = window.pdfWorkerSrc;
            }
            else {
                pdfWorkerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@" + PDFJS__namespace.version + "/es5/build/pdf.worker.js";
            }
            assign(PDFJS__namespace.GlobalWorkerOptions, "workerSrc", pdfWorkerSrc);
        }
        Object.defineProperty(PdfViewerComponent.prototype, "cMapsUrl", {
            set: function (cMapsUrl) {
                this._cMapsUrl = cMapsUrl;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "page", {
            set: function (_page) {
                _page = parseInt(_page, 10) || 1;
                var originalPage = _page;
                if (this._pdf) {
                    _page = this.getValidPageNumber(_page);
                }
                this._page = _page;
                if (originalPage !== _page) {
                    this.pageChange.emit(_page);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "renderText", {
            set: function (renderText) {
                this._renderText = renderText;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "renderTextMode", {
            set: function (renderTextMode) {
                this._renderTextMode = renderTextMode;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "originalSize", {
            set: function (originalSize) {
                this._originalSize = originalSize;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "showAll", {
            set: function (value) {
                this._showAll = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "stickToPage", {
            set: function (value) {
                this._stickToPage = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "zoom", {
            get: function () {
                return this._zoom;
            },
            set: function (value) {
                if (value <= 0) {
                    return;
                }
                this._zoom = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "zoomScale", {
            get: function () {
                return this._zoomScale;
            },
            set: function (value) {
                this._zoomScale = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "rotation", {
            set: function (value) {
                if (!(typeof value === 'number' && value % 90 === 0)) {
                    console.warn('Invalid pages rotation angle.');
                    return;
                }
                this._rotation = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "externalLinkTarget", {
            set: function (value) {
                this._externalLinkTarget = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "autoresize", {
            set: function (value) {
                this._canAutoResize = Boolean(value);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "fitToPage", {
            set: function (value) {
                this._fitToPage = Boolean(value);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "showBorders", {
            set: function (value) {
                this._showBorders = Boolean(value);
            },
            enumerable: false,
            configurable: true
        });
        PdfViewerComponent.getLinkTarget = function (type) {
            switch (type) {
                case 'blank':
                    return PDFJS__namespace.LinkTarget.BLANK;
                case 'none':
                    return PDFJS__namespace.LinkTarget.NONE;
                case 'self':
                    return PDFJS__namespace.LinkTarget.SELF;
                case 'parent':
                    return PDFJS__namespace.LinkTarget.PARENT;
                case 'top':
                    return PDFJS__namespace.LinkTarget.TOP;
            }
            return null;
        };
        PdfViewerComponent.prototype.ngAfterViewChecked = function () {
            var _this = this;
            if (this.isInitialized) {
                return;
            }
            var offset = this.pdfViewerContainer.nativeElement.offsetParent;
            if (this.isVisible === true && offset == null) {
                this.isVisible = false;
                return;
            }
            if (this.isVisible === false && offset != null) {
                this.isVisible = true;
                setTimeout(function () {
                    _this.ngOnInit();
                    _this.ngOnChanges({ src: _this.src });
                });
            }
        };
        PdfViewerComponent.prototype.ngOnInit = function () {
            if (!isSSR() && this.isVisible) {
                this.isInitialized = true;
                this.setupMultiPageViewer();
                this.setupSinglePageViewer();
            }
        };
        PdfViewerComponent.prototype.ngOnDestroy = function () {
            this.clear();
            this.destroy$.next();
            this.loadingTask = null;
        };
        PdfViewerComponent.prototype.onPageResize = function () {
            var _this = this;
            if (!this._canAutoResize || !this._pdf) {
                return;
            }
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(function () {
                _this.updateSize();
            }, 100);
        };
        Object.defineProperty(PdfViewerComponent.prototype, "pdfLinkService", {
            get: function () {
                return this._showAll
                    ? this.pdfMultiPageLinkService
                    : this.pdfSinglePageLinkService;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "pdfViewer", {
            get: function () {
                return this.getCurrentViewer();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PdfViewerComponent.prototype, "pdfFindController", {
            get: function () {
                return this._showAll
                    ? this.pdfMultiPageFindController
                    : this.pdfSinglePageFindController;
            },
            enumerable: false,
            configurable: true
        });
        PdfViewerComponent.prototype.ngOnChanges = function (changes) {
            if (isSSR() || !this.isVisible) {
                return;
            }
            if ('src' in changes) {
                this.loadPDF();
            }
            else if (this._pdf) {
                if ('renderText' in changes) {
                    this.getCurrentViewer().textLayerMode = this._renderText
                        ? this._renderTextMode
                        : exports.RenderTextMode.DISABLED;
                    this.resetPdfDocument();
                }
                else if ('showAll' in changes) {
                    this.resetPdfDocument();
                }
                if ('page' in changes) {
                    var page = changes.page;
                    if (page.currentValue === this._latestScrolledPage) {
                        return;
                    }
                    // New form of page changing: The viewer will now jump to the specified page when it is changed.
                    // This behavior is introduced by using the PDFSinglePageViewer
                    this.getCurrentViewer().scrollPageIntoView({ pageNumber: this._page });
                }
                this.update();
            }
        };
        PdfViewerComponent.prototype.updateSize = function () {
            var _this = this;
            var currentViewer = this.getCurrentViewer();
            rxjs.from(this._pdf.getPage(currentViewer.currentPageNumber))
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe({
                next: function (page) {
                    var rotation = _this._rotation || page.rotate;
                    var viewportWidth = page.getViewport({
                        scale: _this._zoom,
                        rotation: rotation
                    }).width * PdfViewerComponent.CSS_UNITS;
                    var scale = _this._zoom;
                    var stickToPage = true;
                    // Scale the document when it shouldn't be in original size or doesn't fit into the viewport
                    if (!_this._originalSize ||
                        (_this._fitToPage &&
                            viewportWidth > _this.pdfViewerContainer.nativeElement.clientWidth)) {
                        var viewPort = page.getViewport({ scale: 1, rotation: rotation });
                        scale = _this.getScale(viewPort.width, viewPort.height);
                        stickToPage = !_this._stickToPage;
                    }
                    currentViewer._setScale(scale, stickToPage);
                }
            });
        };
        PdfViewerComponent.prototype.clear = function () {
            if (this.loadingTask && !this.loadingTask.destroyed) {
                this.loadingTask.destroy();
            }
            if (this._pdf) {
                this._pdf.destroy();
                this._pdf = null;
                this.pdfMultiPageViewer.setDocument(null);
                this.pdfSinglePageViewer.setDocument(null);
                this.pdfMultiPageLinkService.setDocument(null, null);
                this.pdfSinglePageLinkService.setDocument(null, null);
                this.pdfMultiPageFindController.setDocument(null);
                this.pdfSinglePageFindController.setDocument(null);
            }
        };
        PdfViewerComponent.prototype.getPDFLinkServiceConfig = function () {
            var pdfLinkServiceConfig = {};
            var linkTarget = PdfViewerComponent.getLinkTarget(this._externalLinkTarget);
            if (linkTarget) {
                pdfLinkServiceConfig.externalLinkTarget = linkTarget;
            }
            return pdfLinkServiceConfig;
        };
        PdfViewerComponent.prototype.setupMultiPageViewer = function () {
            var _this = this;
            assign(PDFJS__namespace, "disableTextLayer", !this._renderText);
            var eventBus = createEventBus(PDFJSViewer__namespace, this.destroy$);
            rxjs.fromEvent(eventBus, 'pagerendered')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.pageRendered.emit(event);
            });
            rxjs.fromEvent(eventBus, 'pagesinit')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.pageInitialized.emit(event);
            });
            rxjs.fromEvent(eventBus, 'pagechanging')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (_a) {
                var pageNumber = _a.pageNumber;
                if (_this.pageScrollTimeout) {
                    clearTimeout(_this.pageScrollTimeout);
                }
                _this.pageScrollTimeout = setTimeout(function () {
                    _this._latestScrolledPage = pageNumber;
                    _this.pageChange.emit(pageNumber);
                }, 100);
            });
            rxjs.fromEvent(eventBus, 'textlayerrendered')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.textLayerRendered.emit(event);
            });
            this.pdfMultiPageLinkService = new PDFJSViewer__namespace.PDFLinkService(Object.assign({ eventBus: eventBus }, this.getPDFLinkServiceConfig()));
            this.pdfMultiPageFindController = new PDFJSViewer__namespace.PDFFindController({
                linkService: this.pdfMultiPageLinkService,
                eventBus: eventBus
            });
            var pdfOptions = {
                eventBus: eventBus,
                container: this.element.nativeElement.querySelector('div'),
                removePageBorders: !this._showBorders,
                linkService: this.pdfMultiPageLinkService,
                textLayerMode: this._renderText
                    ? this._renderTextMode
                    : exports.RenderTextMode.DISABLED,
                findController: this.pdfMultiPageFindController
            };
            this.pdfMultiPageViewer = new PDFJSViewer__namespace.PDFViewer(pdfOptions);
            this.pdfMultiPageLinkService.setViewer(this.pdfMultiPageViewer);
            this.pdfMultiPageFindController.setDocument(this._pdf);
        };
        PdfViewerComponent.prototype.setupSinglePageViewer = function () {
            var _this = this;
            assign(PDFJS__namespace, "disableTextLayer", !this._renderText);
            var eventBus = createEventBus(PDFJSViewer__namespace, this.destroy$);
            rxjs.fromEvent(eventBus, 'pagechanging')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (_a) {
                var pageNumber = _a.pageNumber;
                if (pageNumber !== _this._page) {
                    _this.page = pageNumber;
                }
            });
            rxjs.fromEvent(eventBus, 'pagerendered')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.pageRendered.emit(event);
            });
            rxjs.fromEvent(eventBus, 'pagesinit')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.pageInitialized.emit(event);
            });
            rxjs.fromEvent(eventBus, 'textlayerrendered')
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe(function (event) {
                _this.textLayerRendered.emit(event);
            });
            this.pdfSinglePageLinkService = new PDFJSViewer__namespace.PDFLinkService(Object.assign({ eventBus: eventBus }, this.getPDFLinkServiceConfig()));
            this.pdfSinglePageFindController = new PDFJSViewer__namespace.PDFFindController({
                linkService: this.pdfSinglePageLinkService,
                eventBus: eventBus
            });
            var pdfOptions = {
                eventBus: eventBus,
                container: this.element.nativeElement.querySelector('div'),
                removePageBorders: !this._showBorders,
                linkService: this.pdfSinglePageLinkService,
                textLayerMode: this._renderText
                    ? this._renderTextMode
                    : exports.RenderTextMode.DISABLED,
                findController: this.pdfSinglePageFindController
            };
            this.pdfSinglePageViewer = new PDFJSViewer__namespace.PDFSinglePageViewer(pdfOptions);
            this.pdfSinglePageLinkService.setViewer(this.pdfSinglePageViewer);
            this.pdfSinglePageFindController.setDocument(this._pdf);
            this.pdfSinglePageViewer._currentPageNumber = this._page;
        };
        PdfViewerComponent.prototype.getValidPageNumber = function (page) {
            if (page < 1) {
                return 1;
            }
            if (page > this._pdf.numPages) {
                return this._pdf.numPages;
            }
            return page;
        };
        PdfViewerComponent.prototype.getDocumentParams = function () {
            var srcType = typeof this.src;
            if (!this._cMapsUrl) {
                return this.src;
            }
            var params = {
                cMapUrl: this._cMapsUrl,
                cMapPacked: true
            };
            if (srcType === 'string') {
                params.url = this.src;
            }
            else if (srcType === 'object') {
                if (this.src.byteLength !== undefined) {
                    params.data = this.src;
                }
                else {
                    Object.assign(params, this.src);
                }
            }
            return params;
        };
        PdfViewerComponent.prototype.loadPDF = function () {
            var _this = this;
            if (!this.src) {
                return;
            }
            if (this.lastLoaded === this.src) {
                this.update();
                return;
            }
            this.clear();
            this.loadingTask = PDFJS__namespace.getDocument(this.getDocumentParams());
            this.loadingTask.onProgress = function (progressData) {
                _this.onProgress.emit(progressData);
            };
            var src = this.src;
            rxjs.from(this.loadingTask.promise)
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe({
                next: function (pdf) {
                    _this._pdf = pdf;
                    _this.lastLoaded = src;
                    _this.afterLoadComplete.emit(pdf);
                    if (!_this.pdfMultiPageViewer) {
                        _this.setupMultiPageViewer();
                        _this.setupSinglePageViewer();
                    }
                    _this.resetPdfDocument();
                    _this.update();
                },
                error: function (error) {
                    _this.onError.emit(error);
                }
            });
        };
        PdfViewerComponent.prototype.update = function () {
            this.page = this._page;
            this.render();
        };
        PdfViewerComponent.prototype.render = function () {
            var _this = this;
            this._page = this.getValidPageNumber(this._page);
            var currentViewer = this.getCurrentViewer();
            if (this._rotation !== 0 ||
                currentViewer.pagesRotation !== this._rotation) {
                setTimeout(function () {
                    currentViewer.pagesRotation = _this._rotation;
                });
            }
            if (this._stickToPage) {
                setTimeout(function () {
                    currentViewer.currentPageNumber = _this._page;
                });
            }
            this.updateSize();
        };
        PdfViewerComponent.prototype.getScale = function (viewportWidth, viewportHeight) {
            var borderSize = (this._showBorders ? 2 * PdfViewerComponent.BORDER_WIDTH : 0);
            var pdfContainerWidth = this.pdfViewerContainer.nativeElement.clientWidth - borderSize;
            var pdfContainerHeight = this.pdfViewerContainer.nativeElement.clientHeight - borderSize;
            if (pdfContainerHeight === 0 || viewportHeight === 0 || pdfContainerWidth === 0 || viewportWidth === 0) {
                return 1;
            }
            var ratio = 1;
            switch (this._zoomScale) {
                case 'page-fit':
                    ratio = Math.min((pdfContainerHeight / viewportHeight), (pdfContainerWidth / viewportWidth));
                    break;
                case 'page-height':
                    ratio = (pdfContainerHeight / viewportHeight);
                    break;
                case 'page-width':
                default:
                    ratio = (pdfContainerWidth / viewportWidth);
                    break;
            }
            return (this._zoom * ratio) / PdfViewerComponent.CSS_UNITS;
        };
        PdfViewerComponent.prototype.getCurrentViewer = function () {
            return this._showAll ? this.pdfMultiPageViewer : this.pdfSinglePageViewer;
        };
        PdfViewerComponent.prototype.resetPdfDocument = function () {
            this.pdfFindController.setDocument(this._pdf);
            if (this._showAll) {
                this.pdfSinglePageViewer.setDocument(null);
                this.pdfSinglePageLinkService.setDocument(null);
                this.pdfMultiPageViewer.setDocument(this._pdf);
                this.pdfMultiPageLinkService.setDocument(this._pdf, null);
            }
            else {
                this.pdfMultiPageViewer.setDocument(null);
                this.pdfMultiPageLinkService.setDocument(null);
                this.pdfSinglePageViewer.setDocument(this._pdf);
                this.pdfSinglePageLinkService.setDocument(this._pdf, null);
            }
        };
        return PdfViewerComponent;
    }());
    PdfViewerComponent.CSS_UNITS = 96.0 / 72.0;
    PdfViewerComponent.BORDER_WIDTH = 9;
    PdfViewerComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'pdf-viewer',
                    template: "\n    <div #pdfViewerContainer class=\"ng2-pdf-viewer-container\" style=\"position:absolute;width:100%\">\n      <div class=\"pdfViewer\"></div>\n    </div>\n  ",
                    styles: [".ng2-pdf-viewer-container{overflow-x:auto;position:absolute;height:100%;-webkit-overflow-scrolling:touch}:host ::ng-deep .textLayer{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:.2;line-height:1}:host ::ng-deep .textLayer>span{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0 0}:host ::ng-deep .textLayer .highlight{margin:-1px;padding:1px;background-color:#b400aa;border-radius:4px}:host ::ng-deep .textLayer .highlight.begin{border-radius:4px 0 0 4px}:host ::ng-deep .textLayer .highlight.end{border-radius:0 4px 4px 0}:host ::ng-deep .textLayer .highlight.middle{border-radius:0}:host ::ng-deep .textLayer .highlight.selected{background-color:#006400}:host ::ng-deep .textLayer ::-moz-selection{background:#00f}:host ::ng-deep .textLayer ::selection{background:#00f}:host ::ng-deep .textLayer .endOfContent{display:block;position:absolute;left:0;top:100%;right:0;bottom:0;z-index:-1;cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}:host ::ng-deep .textLayer .endOfContent.active{top:0}:host ::ng-deep .annotationLayer section{position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a,:host ::ng-deep .annotationLayer .linkAnnotation>a{position:absolute;font-size:1em;top:0;left:0;width:100%;height:100%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a:hover,:host ::ng-deep .annotationLayer .linkAnnotation>a:hover{opacity:.2;background:#ff0;box-shadow:0 2px 10px #ff0}:host ::ng-deep .annotationLayer .textAnnotation img{position:absolute;cursor:pointer}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select,:host ::ng-deep .annotationLayer .textWidgetAnnotation input,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;padding:0 3px;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select option{padding:0}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{border-radius:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{font:message-box;font-size:9px;resize:none}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input[disabled],:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input[disabled],:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation input[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea[disabled]{background:none;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:hover,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:hover,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:focus{background:none;border:1px solid transparent}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{background-color:#000;content:\"\";display:block;position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{height:80%;left:45%;width:1px}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{transform:rotate(45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after{transform:rotate(-45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{border-radius:50%;height:50%;left:30%;top:20%;width:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb{font-family:monospace;padding-left:2px;padding-right:0}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb:focus{width:115%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0}:host ::ng-deep .annotationLayer .popupWrapper{position:absolute;width:20em}:host ::ng-deep .annotationLayer .popup{position:absolute;z-index:200;max-width:20em;background-color:#ff9;box-shadow:0 2px 5px #888;border-radius:2px;padding:6px;margin-left:5px;cursor:pointer;font:message-box;font-size:9px;word-wrap:break-word}:host ::ng-deep .annotationLayer .popup>*{font-size:9px}:host ::ng-deep .annotationLayer .popup h1{display:inline-block}:host ::ng-deep .annotationLayer .popup span{display:inline-block;margin-left:5px}:host ::ng-deep .annotationLayer .popup p{border-top:1px solid #333;margin-top:2px;padding-top:2px}:host ::ng-deep .annotationLayer .caretAnnotation,:host ::ng-deep .annotationLayer .circleAnnotation svg ellipse,:host ::ng-deep .annotationLayer .fileAttachmentAnnotation,:host ::ng-deep .annotationLayer .freeTextAnnotation,:host ::ng-deep .annotationLayer .highlightAnnotation,:host ::ng-deep .annotationLayer .inkAnnotation svg polyline,:host ::ng-deep .annotationLayer .lineAnnotation svg line,:host ::ng-deep .annotationLayer .polygonAnnotation svg polygon,:host ::ng-deep .annotationLayer .polylineAnnotation svg polyline,:host ::ng-deep .annotationLayer .squareAnnotation svg rect,:host ::ng-deep .annotationLayer .squigglyAnnotation,:host ::ng-deep .annotationLayer .stampAnnotation,:host ::ng-deep .annotationLayer .strikeoutAnnotation,:host ::ng-deep .annotationLayer .underlineAnnotation{cursor:pointer}:host ::ng-deep .pdfViewer{padding-bottom:10px}:host ::ng-deep .pdfViewer .canvasWrapper{overflow:hidden}:host ::ng-deep .pdfViewer .page{direction:ltr;width:816px;height:1056px;margin:1px auto -8px;position:relative;overflow:visible;border:9px solid rgba(0,0,0,.01);box-sizing:content-box;box-sizing:initial;background-clip:content-box;-o-border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;background-color:#fff}:host ::ng-deep .pdfViewer.removePageBorders .page{margin:0 auto 10px;border:none}:host ::ng-deep .pdfViewer.removePageBorders{padding-bottom:0}:host ::ng-deep .pdfViewer.singlePageView{display:inline-block}:host ::ng-deep .pdfViewer.singlePageView .page{margin:0;border:none}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .pdfViewer.scrollWrapped,:host ::ng-deep .spread{margin-left:3.5px;margin-right:3.5px;text-align:center}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .spread{white-space:nowrap}:host ::ng-deep .pdfViewer.removePageBorders,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .spread{margin-left:0;margin-right:0}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .pdfViewer.scrollWrapped .spread,:host ::ng-deep .spread .page{display:inline-block;vertical-align:middle}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .spread .page{margin-left:-3.5px;margin-right:-3.5px}:host ::ng-deep .pdfViewer.removePageBorders.scrollHorizontal .page,:host ::ng-deep .pdfViewer.removePageBorders.scrollWrapped .page,:host ::ng-deep .pdfViewer.removePageBorders .spread .page{margin-left:5px;margin-right:5px}:host ::ng-deep .pdfViewer .page canvas{margin:0;display:block}:host ::ng-deep .pdfViewer .page canvas[hidden]{display:none}:host ::ng-deep .pdfViewer .page .loadingIcon{position:absolute;display:block;left:0;top:0;right:0;bottom:0;background:url(\"data:image/gif;base64,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\") 50% no-repeat}:host ::ng-deep .pdfPresentationMode .pdfViewer{margin-left:0;margin-right:0}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer .spread{display:block}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer.removePageBorders .page{margin-left:auto;margin-right:auto}:host ::ng-deep .pdfPresentationMode:-ms-fullscreen .pdfViewer .page{margin-bottom:100%!important}:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page{margin-bottom:100%;border:0}:host ::ng-deep .pdfPresentationMode:-moz-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:fullscreen .pdfViewer .page{margin-bottom:100%;border:0}"]
                },] }
    ];
    PdfViewerComponent.ctorParameters = function () { return [
        { type: core.ElementRef }
    ]; };
    PdfViewerComponent.propDecorators = {
        pdfViewerContainer: [{ type: core.ViewChild, args: ['pdfViewerContainer',] }],
        afterLoadComplete: [{ type: core.Output, args: ['after-load-complete',] }],
        pageRendered: [{ type: core.Output, args: ['page-rendered',] }],
        pageInitialized: [{ type: core.Output, args: ['pages-initialized',] }],
        textLayerRendered: [{ type: core.Output, args: ['text-layer-rendered',] }],
        onError: [{ type: core.Output, args: ['error',] }],
        onProgress: [{ type: core.Output, args: ['on-progress',] }],
        pageChange: [{ type: core.Output }],
        src: [{ type: core.Input }],
        cMapsUrl: [{ type: core.Input, args: ['c-maps-url',] }],
        page: [{ type: core.Input, args: ['page',] }],
        renderText: [{ type: core.Input, args: ['render-text',] }],
        renderTextMode: [{ type: core.Input, args: ['render-text-mode',] }],
        originalSize: [{ type: core.Input, args: ['original-size',] }],
        showAll: [{ type: core.Input, args: ['show-all',] }],
        stickToPage: [{ type: core.Input, args: ['stick-to-page',] }],
        zoom: [{ type: core.Input, args: ['zoom',] }],
        zoomScale: [{ type: core.Input, args: ['zoom-scale',] }],
        rotation: [{ type: core.Input, args: ['rotation',] }],
        externalLinkTarget: [{ type: core.Input, args: ['external-link-target',] }],
        autoresize: [{ type: core.Input, args: ['autoresize',] }],
        fitToPage: [{ type: core.Input, args: ['fit-to-page',] }],
        showBorders: [{ type: core.Input, args: ['show-borders',] }],
        onPageResize: [{ type: core.HostListener, args: ['window:resize', [],] }]
    };

    /**
     * Created by vadimdez on 01/11/2016.
     */
    var PdfViewerModule = /** @class */ (function () {
        function PdfViewerModule() {
        }
        return PdfViewerModule;
    }());
    PdfViewerModule.decorators = [
        { type: core.NgModule, args: [{
                    declarations: [PdfViewerComponent],
                    exports: [PdfViewerComponent]
                },] }
    ];

    /**
     * Generated bundle index. Do not edit.
     */

    Object.defineProperty(exports, 'PDFDocumentProxy', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFDocumentProxy;
        }
    });
    Object.defineProperty(exports, 'PDFJSStatic', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFJSStatic;
        }
    });
    Object.defineProperty(exports, 'PDFPageProxy', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFPageProxy;
        }
    });
    Object.defineProperty(exports, 'PDFProgressData', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFProgressData;
        }
    });
    Object.defineProperty(exports, 'PDFPromise', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFPromise;
        }
    });
    Object.defineProperty(exports, 'PDFSource', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFSource;
        }
    });
    Object.defineProperty(exports, 'PDFViewerParams', {
        enumerable: true,
        get: function () {
            return PDFJS.PDFViewerParams;
        }
    });
    exports.PdfViewerComponent = PdfViewerComponent;
    exports.PdfViewerModule = PdfViewerModule;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ng2-pdf-viewer.umd.js.map
