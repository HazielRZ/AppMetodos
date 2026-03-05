/**
 * Motor de Evaluación Matemática
 * Convierte el input de MathLive a una expresión evaluable por Math.js
 */
class EvaluadorMatematico {
    constructor(mathFieldElement) {
        // Se utiliza 'ascii-math' como puente estandarizado entre MathLive y Math.js
        let rawExpression = mathFieldElement.getValue('ascii-math');

        // Validación estricta de la cadena obtenida
        if (!rawExpression || rawExpression.trim() === '') {
            throw new Error("La expresión matemática está vacía o no es válida.");
        }

        // Math.js compila la cadena ascii-math sin problemas de lectura
        this.expr = math.compile(rawExpression);
    }

    evaluar(x) {
        // Se evalúa la expresión sustituyendo la variable 'x'
        return this.expr.evaluate({ x: x });
    }
}

/**
 * Controlador de Animación y UI de Tablas
 */
class InterfazTabla {
    constructor() {
        this.tbody = document.querySelector('#resultsTable tbody');
        this.VELOCIDAD_MS = 600;
    }

    limpiar() {
        this.tbody.innerHTML = '';
    }

    esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async insertarFilaAnimada(datos) {
        const tr = document.createElement('tr');
        tr.innerHTML = datos.map(val => `<td>${val}</td>`).join('');
        this.tbody.appendChild(tr);

        // Reflow para activar la transición CSS
        void tr.offsetWidth;
        tr.classList.add('visible');
        tr.scrollIntoView({ behavior: 'smooth', block: 'end' });

        await this.esperar(this.VELOCIDAD_MS);
    }

    actualizarMetricas(raiz, iteraciones, error) {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('finalRoot').innerText = raiz.toFixed(6);
        document.getElementById('totalIter').innerText = iteraciones;
        document.getElementById('finalError').innerText = error.toFixed(5);
    }
}

/**
 * Implementación de Métodos Numéricos
 */
class MetodosNumericos {
    static async biseccion(evaluador, xi, xu, tol, ui) {
        let xr = 0, xrOld = 0, error = 100, iter = 0;

        // Evaluación del Teorema de Bolzano (cambio de signo)
        if (evaluador.evaluar(xi) * evaluador.evaluar(xu) >= 0) {
            throw new Error("El intervalo no encierra una raíz (no hay cambio de signo inicial).");
        }

        while (error > tol && iter < 100) {
            iter++;
            xrOld = xr;
            xr = (xi + xu) / 2;

            const fXi = evaluador.evaluar(xi);
            const fXr = evaluador.evaluar(xr);

            if (iter > 1) {
                // Detección de singularidad en cero:
                // Si hay oscilación sobre el origen (signos opuestos) o xr es muy pequeño
                if ((xr * xrOld < 0) || Math.abs(xr) < 1e-3) {
                    // Transición a Error Absoluto (reducción geométrica del intervalo)
                    // Multiplicamos por 100 para mantener la escala porcentual de la UI
                    error = Math.abs(xr - xrOld) * 100;
                } else {
                    // Error Relativo Aproximado Porcentual clásico
                    error = Math.abs((xr - xrOld) / xr) * 100;
                }
            }

            // Criterio de paro estricto por residuo
            if (Math.abs(fXr) < 1e-15) {
                error = 0;
            }

            // Renderizado de la fila en la tabla
            await ui.insertarFilaAnimada([
                iter,
                xi.toFixed(5),
                xu.toFixed(5),
                xr.toFixed(5),
                fXi.toFixed(5),
                fXr.toFixed(5),
                iter === 1 ? '-' : error.toFixed(5)
            ]);

            // Redefinición del subintervalo
            if (fXi * fXr < 0) {
                xu = xr;
            } else if (fXi * fXr > 0) {
                xi = xr;
            } else {
                error = 0; // Se encontró la raíz exacta
            }
        }
        return { raiz: xr, iteraciones: iter, error: error };
    }
}
// ==========================================
// Inicialización y Gestión de Eventos DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnSolve = document.getElementById('btnSolve');
    if (!btnSolve) return; // Se omite si está en index.html

    const mathInput = document.getElementById('mathInput');
    const ui = new InterfazTabla();

    btnSolve.addEventListener('click', async () => {
        try {
            // Deshabilitar UI durante el cálculo
            btnSolve.disabled = true;
            btnSolve.textContent = "Procesando Iteraciones...";
            ui.limpiar();

            const evaluador = new EvaluadorMatematico(mathInput);
            const metodo = btnSolve.dataset.method;
            const tol = parseFloat(document.getElementById('tolerance').value);

            let resultado;


            if (metodo === 'biseccion') {
                const xi = parseFloat(document.getElementById('inputXi').value);
                const xu = parseFloat(document.getElementById('inputXu').value);
                resultado = await MetodosNumericos.biseccion(evaluador, xi, xu, tol, ui);
            }
            // Añadir aquí la lógica para Newton y Secante extraída de la misma forma...

            if (resultado) {
                ui.actualizarMetricas(resultado.raiz, resultado.iteraciones, resultado.error);
            }

        } catch (error) {
            alert(`Error de ejecución: ${error.message}`);
        } finally {
            // Restaurar estado del botón
            btnSolve.disabled = false;
            btnSolve.textContent = "Calcular Raíz";
        }
    });
});