document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnCalculate = document.getElementById('btn-calculate');
    const matrixContainer = document.getElementById('matrix-container');
    const matrixGrid = document.getElementById('matrix-grid');
    const resultsContainer = document.getElementById('results-container');

    let n = 3; // Tamaño por defecto

    // Generar campos de entrada para la matriz
    btnGenerate.addEventListener('click', () => {
        n = parseInt(document.getElementById('matrix-size').value);
        if (n < 2) return alert('El tamaño de la matriz debe ser al menos 2.');

        matrixGrid.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'matrix-row';

            // Coeficientes A
            for (let j = 0; j < n; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = 'any';
                input.className = 'matrix-input a-input';
                input.id = `a_${i}_${j}`;
                input.placeholder = `a${i+1}${j+1}`;
                rowDiv.appendChild(input);
            }

            // Divisor visual (Línea | )
            const divider = document.createElement('div');
            divider.className = 'matrix-divider';
            rowDiv.appendChild(divider);

            // Términos independientes B
            const bInput = document.createElement('input');
            bInput.type = 'number';
            bInput.step = 'any';
            bInput.className = 'matrix-input b-input';
            bInput.id = `b_${i}`;
            bInput.placeholder = `b${i+1}`;
            rowDiv.appendChild(bInput);

            matrixGrid.appendChild(rowDiv);
        }

        matrixContainer.style.display = 'block';
        resultsContainer.style.display = 'none';
    });

    // Ejecutar Método de Jacobi
    btnCalculate.addEventListener('click', () => {
        const A = [];
        const B = [];
        const tolerance = parseFloat(document.getElementById('tolerance').value);
        const maxIter = parseInt(document.getElementById('max-iter').value);

        // Leer datos de la interfaz
        try {
            for (let i = 0; i < n; i++) {
                A[i] = [];
                for (let j = 0; j < n; j++) {
                    const val = parseFloat(document.getElementById(`a_${i}_${j}`).value);
                    if (isNaN(val)) throw new Error('Faltan coeficientes por ingresar.');
                    A[i][j] = val;
                }
                const bVal = parseFloat(document.getElementById(`b_${i}`).value);
                if (isNaN(bVal)) throw new Error('Faltan términos independientes por ingresar.');
                B[i] = bVal;
            }
        } catch (e) {
            alert(e.message);
            return;
        }

        // Validación de Dominancia Diagonal (Criterio de Convergencia)
        let isDiagonallyDominant = true;
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (i !== j) sum += Math.abs(A[i][j]);
            }
            if (Math.abs(A[i][i]) < sum) {
                isDiagonallyDominant = false;
                break;
            }
            if (A[i][i] === 0) {
                alert(`El elemento en la diagonal A[${i+1}][${i+1}] es cero. El método fallará.`);
                return;
            }
        }

        const warningDiv = document.getElementById('convergence-warning');
        if (!isDiagonallyDominant) {
            warningDiv.innerHTML = `<h3 style="color: #ef4444;">Advertencia</h3>
                                    <p>La matriz NO es estrictamente diagonalmente dominante. El método podría no converger.</p>`;
        } else {
            warningDiv.innerHTML = `<h3 style="color: #22c55e;">Sistema Óptimo</h3>
                                    <p>La matriz es diagonalmente dominante. Se garantiza la convergencia.</p>`;
        }

        // Lógica de Jacobi
        let X = new Array(n).fill(0); // Vector inicial (ceros)
        let X_new = new Array(n).fill(0);
        let error = 100;
        let iter = 0;
        const iterationsData = [];

        while (error > tolerance && iter < maxIter) {
            error = 0;

            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        sum += A[i][j] * X[j]; // En Jacobi se usa el vector X de la iteración anterior
                    }
                }
                X_new[i] = (B[i] - sum) / A[i][i];

                // Cálculo del error usando la Norma Infinito (máxima diferencia)
                let currentError = Math.abs(X_new[i] - X[i]);
                if (currentError > error) {
                    error = currentError;
                }
            }

            // Clonar X_new a X para la siguiente iteración
            X = [...X_new];
            iter++;

            iterationsData.push({ iteration: iter, values: [...X], error: error });
        }

        renderTable(iterationsData, n);
        resultsContainer.style.display = 'block';
    });

    function renderTable(data, numVars) {
        const headerRow = document.getElementById('table-header');
        const tableBody = document.getElementById('table-body');

        // Configurar encabezados
        headerRow.innerHTML = '<th>Iteración (k)</th>';
        for (let i = 1; i <= numVars; i++) {
            headerRow.innerHTML += `<th>x${i}</th>`;
        }
        headerRow.innerHTML += '<th>Error (L∞)</th>';

        // Llenar tabla
        tableBody.innerHTML = '';
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            // Retraso para animación en cascada de la tabla
            setTimeout(() => tr.classList.add('visible'), 50 * index);

            let html = `<td>${row.iteration}</td>`;
            row.values.forEach(val => {
                html += `<td>${val.toFixed(6)}</td>`;
            });
            html += `<td>${row.error === 100 && index === 0 ? '-' : row.error.toFixed(6)}</td>`;

            tr.innerHTML = html;
            tableBody.appendChild(tr);
        });
    }
});