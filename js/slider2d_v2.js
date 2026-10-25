import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Comfy.Slider2D.Nodes2_0",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "MXSlider2D_V2") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

            // Храним настройки внутри properties ноды (как в оригинальном Slider 2D).
            // Их можно менять в правой панели Properties в ComfyUI, не захламляя саму ноду.
            this.properties = this.properties || {};
            if (this.properties.width === undefined) this.properties.width = 1024;
            if (this.properties.height === undefined) this.properties.height = 1024;
            if (this.properties.min_size === undefined) this.properties.min_size = 256;
            if (this.properties.max_size === undefined) this.properties.max_size = 2048;
            if (this.properties.step === undefined) this.properties.step = 64;

            // На случай если в старом воркфлоу остались старые виджеты — полностью очищаем их
            this.widgets = [];

            // Контейнер только с 2D-сеткой (без ползунков и без панели Swap)
            const container = document.createElement("div");
            container.style.cssText = `
                display: flex;
                width: 100%;
                height: 100%;
                padding: 4px;
                box-sizing: border-box;
                user-select: none;
            `;

            const padWrap = document.createElement("div");
            padWrap.style.cssText = `
                position: relative;
                width: 100%;
                height: 220px;
                background: #161616;
                border-radius: 6px;
                border: 1px solid #2e2e2e;
                overflow: hidden;
                cursor: crosshair;
                touch-action: none;
            `;

            const canvas = document.createElement("canvas");
            canvas.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
            `;
            padWrap.appendChild(canvas);
            container.appendChild(padWrap);

            // Регистрируем DOM-виджет для совместимости с Nodes 2.0
            const domWidget = this.addDOMWidget("slider2d_pad", "custom", container, {
                serialize: false,
                hideOnZoom: false,
            });
            domWidget.computeSize = () => [220, 230];

            const snap = (val, step, min, max) => {
                const clamped = Math.max(min, Math.min(max, val));
                return Math.round(clamped / step) * step;
            };

            const getParams = () => {
                const min = Number(this.properties.min_size) || 256;
                const max = Math.max(min + 64, Number(this.properties.max_size) || 2048);
                const step = Math.max(8, Number(this.properties.step) || 64);
                const w = Number(this.properties.width) || 1024;
                const h = Number(this.properties.height) || 1024;
                return { w, h, min, max, step };
            };

            // Обновляем подписи выходных точек справа (например: 1920 и 1152 вместо слов width и height)
            const updateOutputLabels = (w, h) => {
                if (this.outputs && this.outputs.length >= 2) {
                    this.outputs[0].label = String(w);
                    this.outputs[1].label = String(h);
                }
            };

            const drawPad = () => {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                const cw = rect.width || 210;
                const ch = rect.height || 210;

                if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
                    canvas.width = Math.floor(cw * dpr);
                    canvas.height = Math.floor(ch * dpr);
                }

                const ctx = canvas.getContext("2d");
                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.clearRect(0, 0, cw, ch);

                const { w, h, min, max, step } = getParams();
                updateOutputLabels(w, h);

                const pad = 12;
                const plotW = cw - pad * 2;
                const plotH = ch - pad * 2;

                // Точечная сетка
                const totalSteps = Math.max(1, Math.round((max - min) / step));
                const dotInterval = totalSteps > 28 ? Math.ceil(totalSteps / 16) : 1;

                ctx.fillStyle = "#555555";
                for (let ix = 0; ix <= totalSteps; ix += dotInterval) {
                    for (let iy = 0; iy <= totalSteps; iy += dotInterval) {
                        const gx = pad + (ix / totalSteps) * plotW;
                        const gy = pad + ((totalSteps - iy) / totalSteps) * plotH;
                        ctx.fillRect(gx - 1, gy - 1, 2, 2);
                    }
                }

                // Позиция рамки и ползунка
                const normX = Math.max(0, Math.min(1, (w - min) / (max - min)));
                const normY = Math.max(0, Math.min(1, (h - min) / (max - min)));

                const px = pad + normX * plotW;
                const py = pad + (1 - normY) * plotH;
                const originX = pad;
                const originY = pad + plotH;

                ctx.fillStyle = "rgba(180, 180, 180, 0.12)";
                ctx.strokeStyle = "#9e9e9e";
                ctx.lineWidth = 1.5;

                const boxW = Math.max(2, px - originX);
                const boxH = Math.max(2, originY - py);

                ctx.fillRect(originX, py, boxW, boxH);
                ctx.strokeRect(originX, py, boxW, boxH);

                // Круглая ручка на углу рамки
                ctx.beginPath();
                ctx.arc(px, py, 6.5, 0, Math.PI * 2);
                ctx.fillStyle = "#222";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#b5b5b5";
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = "#9e9e9e";
                ctx.fill();

                ctx.restore();
            };

            const updateFromPointer = (clientX, clientY) => {
                const rect = canvas.getBoundingClientRect();
                const pad = 12;
                const plotW = Math.max(1, rect.width - pad * 2);
                const plotH = Math.max(1, rect.height - pad * 2);

                const relX = Math.max(0, Math.min(1, (clientX - rect.left - pad) / plotW));
                const relY = Math.max(0, Math.min(1, 1 - (clientY - rect.top - pad) / plotH));

                const { min, max, step } = getParams();
                this.properties.width = snap(min + relX * (max - min), step, min, max);
                this.properties.height = snap(min + relY * (max - min), step, min, max);

                updateOutputLabels(this.properties.width, this.properties.height);
                drawPad();
                app.graph.setDirtyCanvas(true, true);
            };

            let isDragging = false;
            padWrap.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                isDragging = true;
                padWrap.setPointerCapture(e.pointerId);
                updateFromPointer(e.clientX, e.clientY);
            });

            padWrap.addEventListener("pointermove", (e) => {
                if (!isDragging) return;
                e.stopPropagation();
                updateFromPointer(e.clientX, e.clientY);
            });

            const stopDrag = (e) => {
                if (!isDragging) return;
                isDragging = false;
                try {
                    padWrap.releasePointerCapture(e.pointerId);
                } catch (_) {}
            };
            padWrap.addEventListener("pointerup", stopDrag);
            padWrap.addEventListener("pointercancel", stopDrag);

            // Восстановление значений при загрузке сохраненного воркфлоу
            const origOnConfigure = this.onConfigure;
            this.onConfigure = function (info) {
                origOnConfigure?.apply(this, arguments);
                drawPad();
            };

            // Перерисовка при изменении min_size / max_size / step в боковой панели Properties
            const origOnPropertyChanged = this.onPropertyChanged;
            this.onPropertyChanged = function (name, value) {
                origOnPropertyChanged?.apply(this, arguments);
                drawPad();
            };

            setTimeout(() => drawPad(), 50);

            const ro = new ResizeObserver(() => drawPad());
            ro.observe(padWrap);

            this.setSize([240, 290]);
            return r;
        };
    },
});