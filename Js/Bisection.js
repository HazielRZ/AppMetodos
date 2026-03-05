/**
 * Convierte el input de MathLive a una expresión evaluable por Math.js
 */
class EvaluadorMatematico {
    constructor(mathFieldElement) {
        const rawExpression = mathFieldElement.getValue('ascii-math');

        if (!rawExpression || rawExpression.trim() === '') {
            throw new Error("La expresión matemática está vacía o es inválida.");
        }

        // Compilación
        this.expr = math.compile(rawExpression);

        // Compilación de derivada
        try {
            this.deriv = math.derivative(rawExpression, 'x').compile();
        } catch (e) {
            this.deriv = null;
        }
    }

    evaluar(x) {
        return this.expr.evaluate({x: x});
    }

    evaluarDerivada(x) {
        if (!this.deriv) {
            throw new Error("No es posible calcular la derivada simbólica para esta expresión.");
        }
        return this.deriv.evaluate({x: x});
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
        document.getElementById('resultsSection').style.display = 'none';
    }

    esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async insertarFilaAnimada(datos) {
        const tr = document.createElement('tr');
        tr.innerHTML = datos.map(val => `<td>${val}</td>`).join('');
        this.tbody.appendChild(tr);

        void tr.offsetWidth; // Forzar reflow
        tr.classList.add('visible');
        tr.scrollIntoView({behavior: 'smooth', block: 'end'});

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
 * Suite de Algoritmos Numéricos
 */
class MetodosNumericos {
    static async biseccion(evaluador, xi, xu, tol, ui) {
        let xr = 0, xrOld = 0, error = 100, iter = 0;

        const evalXi = evaluador.evaluar(xi);
        const evalXu = evaluador.evaluar(xu);

        // Condiciones de frontera
        if (Math.abs(evalXi) < 1e-15) return {raiz: xi, iteraciones: 0, error: 0};
        if (Math.abs(evalXu) < 1e-15) return {raiz: xu, iteraciones: 0, error: 0};

        if (evalXi * evalXu > 0) {
            throw new Error("El intervalo no encierra una raíz (f(xi) y f(xu) tienen el mismo signo).");
        }

        while (error > tol && iter < 100) {
            iter++;
            xrOld = xr;
            xr = (xi + xu) / 2;

            const fXi = evaluador.evaluar(xi);
            const fXr = evaluador.evaluar(xr);

            if (iter > 1) {
                if ((xr * xrOld < 0) || Math.abs(xr) < 1e-3) {
                    error = Math.abs(xr - xrOld) * 100;
                } else {
                    error = Math.abs((xr - xrOld) / xr) * 100;
                }
            }

            if (Math.abs(fXr) < 1e-15) error = 0;

            await ui.insertarFilaAnimada([
                iter, xi.toFixed(5), xu.toFixed(5), xr.toFixed(5),
                fXi.toFixed(5), fXr.toFixed(5), iter === 1 ? '-' : error.toFixed(5)
            ]);

            if (fXi * fXr < 0) {
                xu = xr;
            } else if (fXi * fXr > 0) {
                xi = xr;
            } else {
                error = 0;
            }
            if (error === 0) break;
        }
        return {raiz: xr, iteraciones: iter, error: error};
    }

    static async newton(evaluador, x0, tol, ui) {
        let xi = x0;
        let error = 100, iter = 0;

        // Condición de frontera inicial
        if (Math.abs(evaluador.evaluar(xi)) < 1e-15) {
            await ui.insertarFilaAnimada([0, xi.toFixed(5), "0.00000", "-", "-", "0.00000"]);
            return {raiz: xi, iteraciones: 0, error: 0};
        }

        while (error > tol && iter < 100) {
            iter++;
            const fXi = evaluador.evaluar(xi);
            const dfXi = evaluador.evaluarDerivada(xi);

            if (Math.abs(dfXi) < 1e-15) {
                throw new Error("Derivada nula. El método diverge por tangente horizontal.");
            }

            const xi_next = xi - (fXi / dfXi);

            if (iter > 1) {
                if ((xi_next * xi <= 0) || Math.abs(xi_next) < 1.0) {
                    error = Math.abs(xi_next - xi) * 100;
                } else {
                    error = Math.abs((xi_next - xi) / xi_next) * 100;
                }
            }

            // Verificación residual
            if (Math.abs(evaluador.evaluar(xi_next)) < 1e-15) error = 0;

            await ui.insertarFilaAnimada([
                iter, xi.toFixed(5), fXi.toFixed(5), dfXi.toFixed(5),
                xi_next.toFixed(5), iter === 1 ? '-' : error.toFixed(5)
            ]);

            xi = xi_next;
            if (error === 0) break;
        }
        return {raiz: xi, iteraciones: iter, error: error};
    }

    static async secante(evaluador, x_prev, x0, tol, ui) {
        let x_m1 = x_prev;
        let xi = x0;
        let error = 100, iter = 0;

        const f_m1_init = evaluador.evaluar(x_m1);
        const f_xi_init = evaluador.evaluar(xi);

        if (Math.abs(f_xi_init) < 1e-15) {
            await ui.insertarFilaAnimada([0, x_m1.toFixed(5), xi.toFixed(5), f_m1_init.toFixed(5), "0.00000", "-", "0.00000"]);
            return {raiz: xi, iteraciones: 0, error: 0};
        }

        while (error > tol && iter < 100) {
            iter++;
            const f_m1 = evaluador.evaluar(x_m1);
            const f_xi = evaluador.evaluar(xi);

            const diferencial_f = f_m1 - f_xi;
            if (Math.abs(diferencial_f) < 1e-15) {
                throw new Error("Diferencia nula en el denominador (división por cero).");
            }

            const xi_next = xi - (f_xi * (x_m1 - xi)) / diferencial_f;

            if (iter > 1) {
                if ((xi_next * xi < 0) || Math.abs(xi_next) < 1e-4) {
                    error = Math.abs(xi_next - xi) * 100;
                } else {
                    error = Math.abs((xi_next - xi) / xi_next) * 100;
                }
            }

            if (Math.abs(evaluador.evaluar(xi_next)) < 1e-15) error = 0;

            await ui.insertarFilaAnimada([
                iter, x_m1.toFixed(5), xi.toFixed(5), f_m1.toFixed(5),
                f_xi.toFixed(5), xi_next.toFixed(5), iter === 1 ? '-' : error.toFixed(5)
            ]);

            x_m1 = xi;
            xi = xi_next;
            if (error === 0) break;
        }
        return {raiz: xi, iteraciones: iter, error: error};
    }
}

// ==========================================
// Integración del DOM y Enrutamiento Central
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnSolve = document.getElementById('btnSolve');
    if (!btnSolve) return;

    const mathInput = document.getElementById('mathInput');
    const ui = new InterfazTabla();

    btnSolve.addEventListener('click', async () => {
        try {
            btnSolve.disabled = true;
            btnSolve.textContent = "Procesando Iteraciones...";
            ui.limpiar();

            const evaluador = new EvaluadorMatematico(mathInput);
            const metodo = btnSolve.dataset.method;
            const tol = parseFloat(document.getElementById('tolerance').value);

            let resultado;

            // Enrutamiento algorítmico
            switch (metodo) {
                case 'biseccion':
                    const xi = parseFloat(document.getElementById('inputXi').value);
                    const xu = parseFloat(document.getElementById('inputXu').value);
                    resultado = await MetodosNumericos.biseccion(evaluador, xi, xu, tol, ui);
                    break;
                case 'newton':
                    const x0 = parseFloat(document.getElementById('inputX0').value);
                    resultado = await MetodosNumericos.newton(evaluador, x0, tol, ui);
                    break;
                case 'secante':
                    const x_prev = parseFloat(document.getElementById('inputX_1').value);
                    const x0_sec = parseFloat(document.getElementById('inputX0').value);
                    resultado = await MetodosNumericos.secante(evaluador, x_prev, x0_sec, tol, ui);
                    break;
                default:
                    throw new Error("Método numérico no reconocido.");
            }

            if (resultado) {
                ui.actualizarMetricas(resultado.raiz, resultado.iteraciones, resultado.error);
            }

        } catch (error) {
            alert(`Excepción algorítmica: ${error.message}`);
            console.error(error);
        } finally {
            btnSolve.disabled = false;
            btnSolve.textContent = "Calcular Raíz";
        }
    });
});
