import * as d3 from 'd3';

export function criarGraficoLinhaAjuizamento(rawData) {
  const parseDate = d3.timeParse('%Y-%m');
  const formatDate = d3.timeFormat('%Y-%m');
  const contagemMensal = {};

  rawData.forEach(item => {
    if (item.dataAjuizamento) {
      const date = new Date(item.dataAjuizamento);
      const chave = formatDate(date);
      contagemMensal[chave] = (contagemMensal[chave] || 0) + 1;
    }
  });

  const dados = Object.entries(contagemMensal)
    .map(([mes, valor]) => ({ mes: parseDate(mes), valor }))
    .sort((a, b) => a.mes - b.mes);

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const container = d3.select('#grafico-linha-ajuizamento');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(dados, d => d.mes))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dados, d => d.valor)])
    .nice()
    .range([height, 0]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b/%Y')))
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('transform', 'rotate(-45)')
    .style('font-size', '12px');

  svg.append('g')
    .call(d3.axisLeft(y));

  svg.append('path')
    .datum(dados)
    .attr('fill', 'none')
    .attr('stroke', '#e354ec')
    .attr('stroke-width', 2)
    .attr('d', d3.line()
      .x(d => x(d.mes))
      .y(d => y(d.valor))
    );

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Processos por Mês de Ajuizamento');
} 


export function criarGraficoBolhasTop(rawData) {
  const freq = {}, freqClasse = {}, freqAssunto = {};

  rawData.forEach(item => {
    const cl = item.classe?.nome || 'Indefinido';
    const movimentos = Array.isArray(item.movimentos) ? item.movimentos.length : 0;

    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(aStr => {
        try {
          const a = JSON.parse(aStr);
          const ass = a?.nome || 'Indefinido';
          const k = `${cl}||${ass}`;

          freq[k] = (freq[k] || 0) + movimentos;
          freqClasse[cl] = (freqClasse[cl] || 0) + movimentos;
          freqAssunto[ass] = (freqAssunto[ass] || 0) + movimentos;
        } catch (e) {}
      });
    }
  });

  const topClasses = Object.entries(freqClasse)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => k);

  const topAssuntos = Object.entries(freqAssunto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k]) => k);

  const dados = [];
  topClasses.forEach(cl => {
    topAssuntos.forEach(ass => {
      const k = `${cl}||${ass}`;
      if (freq[k]) dados.push({ classe: cl, assunto: ass, valor: freq[k] });
    });
  });

  const margin = { top: 30, right: 30, bottom: 10, left: 30 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const container = d3.select('#grafico-bolhas-top');
  container.select('svg').remove();
  d3.select('#tooltip-bolhas').remove();

  const tooltip = d3.select('body')
    .append('div')
    .attr('id', 'tooltip-bolhas')
    .style('position', 'absolute')
    .style('background-color', 'rgba(255, 255, 255, 0.95)')
    .style('color', '#000')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '13px')
    .style('font-family', 'sans-serif')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('z-index', '10')
    .style('box-shadow', '0 2px 6px rgba(0,0,0,0.3)');

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(dados, d => d.valor)])
    .range([5, 40]);

  const color = d3.scaleSequential()
    .domain([0, d3.max(dados, d => d.valor)])
    .interpolator(d3.interpolateOrRd);

  const simulation = d3.forceSimulation(dados)
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05))
    .force('collide', d3.forceCollide(d => rScale(d.valor) + 2))
    .stop();

  for (let i = 0; i < 300; ++i) simulation.tick();

  svg.selectAll('circle')
    .data(dados)
    .enter()
    .append('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => rScale(d.valor))
    .attr('fill', d => color(d.valor))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('cursor', 'default')
    .on('mouseover', (event, d) => {
      tooltip
        .style('display', 'block')
        .html(`Classe: ${d.classe}<br>Assunto: ${d.assunto}`);
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => {
      tooltip.style('display', 'none');
    });
}



export function criarHeatMap(rawData) {
  const freq = {}, freqClasse = {}, freqAssunto = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';

    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const assuntoNome = assunto?.nome || 'Indefinido';
          const key = `${classeNome}||${assuntoNome}`;

          freq[key] = (freq[key] || 0) + 1;
          freqClasse[classeNome] = (freqClasse[classeNome] || 0) + 1;
          freqAssunto[assuntoNome] = (freqAssunto[assuntoNome] || 0) + 1;
        } catch {}
      });
    }
  });

  const topClasses = Object.entries(freqClasse).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([key]) => key);
  const topAssuntos = Object.entries(freqAssunto).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([key]) => key);

  const dadosFiltrados = [];
  topClasses.forEach(cl => {
    topAssuntos.forEach(ass => {
      const key = `${cl}||${ass}`;
      const valor = freq[key] || 0;
      dadosFiltrados.push({ classe: cl, assunto: ass, valor });
    });
  });

  const margin = { top: 100, right: 60, bottom: 30, left: 300 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const container = d3.select('#grafico-heatmap');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().range([0, width]).domain(topClasses).padding(0.05);
  const y = d3.scaleBand().range([0, height]).domain(topAssuntos).padding(0.05);
  const color = d3.scaleSequential().interpolator(d3.interpolateYlOrRd).domain([0, d3.max(dadosFiltrados, d => d.valor)]);

  svg.selectAll()
    .data(dadosFiltrados)
    .enter()
    .append('rect')
    .attr('x', d => x(d.classe))
    .attr('y', d => y(d.assunto))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .style('fill', d => d.valor === 0 ? '#eee' : color(d.valor))
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      const processos = rawData.filter(proc => {
        const classeOk = (proc.classe?.nome || 'Indefinido') === d.classe;
        const assuntoOk = Array.isArray(proc.assuntos) && proc.assuntos.some(assuntoStr => {
          try {
            const assunto = JSON.parse(assuntoStr);
            return assunto?.nome === d.assunto;
          } catch {
            return false;
          }
        });
        return classeOk && assuntoOk;
      });

      const listaHtml = processos.map(p => `<li>${p.numeroProcesso || 'Sem número'}</li>`).join('');
      document.getElementById('modal2-titulo').textContent = `Processos - ${d.classe} x ${d.assunto}`;
      document.getElementById('modal2-lista').innerHTML = listaHtml || '<li>Nenhum processo encontrado</li>';
      document.getElementById('modal2').style.display = 'flex';
    })
    .append('title')
    .text(d => `${d.classe} x ${d.assunto}: ${d.valor}`);

  svg.append('g')
    .call(d3.axisTop(x))
    .selectAll('text')
    .style('font-size', '12px')
    .style('text-anchor', 'start')
    .attr('transform', 'rotate(-45)');

  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '12px');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -60)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', '16px');

// Registrar botão fechar modal (uma vez)
  const btnFechar2 = document.getElementById("btn-fechar2");
  if (btnFechar2 && !btnFechar2._eventRegistered) {
    btnFechar2.addEventListener("click", () => {
      document.getElementById("modal2").style.display = "none";
      document.getElementById("modal2-lista").innerHTML = "";
    });
    btnFechar2._eventRegistered = true;
}


    
}



export function criarGraficoBarrasAssuntos(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const nome = assunto?.nome || 'Indefinido';
          contagem[nome] = (contagem[nome] || 0) + 1;
        } catch (e) {
          contagem['Indefinido'] = (contagem['Indefinido'] || 0) + 1;
        }
      });
    }
  });

  const dados = Object.entries(contagem)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 20);

  const margin = { top: 20, right: 30, bottom: 50, left: 180 }; 
  const width = 700 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const container = d3.select('#grafico-barras-assuntos');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style('overflow', 'visible') 
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(dados, d => d.valor) * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(dados.map(d => d.categoria))
    .range([0, height])
    .padding(0.1);

  // Eixo X na parte inferior
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .selectAll("text")
    .style("font-size", "12px");

  // Eixo Y à esquerda
  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  // Barras
  svg.selectAll('rect')
    .data(dados)
    .enter()
    .append('rect')
    .attr('y', d => y(d.categoria))
    .attr('width', d => x(d.valor))
    .attr('height', y.bandwidth())
    .attr('fill', '#6e40aa');

  const tooltip = container.append("div")
    .attr("class", "tooltip-barras")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  svg.selectAll('rect')
    .on('mouseover', (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.categoria}</strong><br>${d.valor} processos`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on('mousemove', (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on('mouseout', () => {
      tooltip.style("opacity", 0);
    });
}



export function criarGraficoPorGrau(rawData) {
  // Contagem por grau
  const contagem = {};
  rawData.forEach(item => {
    const grau = item.grau || 'Indefinido';
    contagem[grau] = (contagem[grau] || 0) + 1;
  });

  const dados = Object.entries(contagem).map(([categoria, valor]) => ({ categoria, valor }));

  // Dimensões
  const width = 400;
  const height = 300;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.categoria))
    .range(d3.schemeSet2);

  const pie = d3.pie()
    .value(d => d.valor)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Remove gráfico anterior
  const container = d3.select('#grafico-grau');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width + 150)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pieData = pie(dados);

  // Desenha os setores
  svg.selectAll('path')
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.categoria))
    .attr('stroke', '#fff')
    .attr('stroke-width', '1px');

  // Legenda
  const legenda = svg.append('g')
    .attr('transform', `translate(${radius + 20}, ${-radius})`);

  legenda.selectAll('rect')
    .data(pieData)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d, i) => i * 22)
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => color(d.data.categoria));

  legenda.selectAll('text')
    .data(pieData)
    .enter()
    .append('text')
    .attr('x', 24)
    .attr('y', (d, i) => i * 22 + 14)
    .text(d => `${d.data.categoria} (${d.data.valor})`)
    .style('fill', 'white')
    .style('font-size', '13px');
}

export function criarGraficoPizzaTop5Deslocado(rawData) {
  // Agrega os dados por classe.nome
  const contagem = {};
  rawData.forEach(item => {
    const nome = item.classe?.nome || 'Indefinido';
    contagem[nome] = (contagem[nome] || 0) + 1;
  });

  // Top 5 classes mais frequentes
  const dados = Object.entries(contagem)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // Dimensões
  const width = 500;
  const height = 400;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.categoria))
    .range(d3.schemePastel1);

  const pie = d3.pie()
    .value(d => d.valor)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const arcExplode = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)
    .padAngle(0.02)
    .cornerRadius(5);

  // Remove gráfico anterior
  const container = d3.select('#grafico-rosquinha-classes-top');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pieData = pie(dados);

  // Desenha os setores com leve deslocamento
  svg.selectAll('path')
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', arcExplode)
    .attr('fill', d => color(d.data.categoria))
    .attr('stroke', '#fff')
    .attr('stroke-width', '1px')
    .attr('transform', d => {
      const [x, y] = arc.centroid(d);
      const deslocamento = 10;
      const angle = (d.startAngle + d.endAngle) / 2;
      const dx = Math.cos(angle) * deslocamento;
      const dy = Math.sin(angle) * deslocamento;
      return `translate(${dx}, ${dy})`;
    });

  // Legenda lateral
  const legenda = svg.append('g')
    .attr('transform', `translate(${radius + 20}, ${-radius})`);

  legenda.selectAll('rect')
    .data(pieData)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d, i) => i * 22)
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => color(d.data.categoria));

  legenda.selectAll('text')
    .data(pieData)
    .enter()
    .append('text')
    .attr('x', 24)
    .attr('y', (d, i) => i * 22 + 14)
    .text(d => d.data.categoria)
    .style('font-size', '13px');
}


export function criarGraficoPizzaComLabelDeslocado(rawData) {

  // Agrega os dados por classe.nome
  const contagem = {};
  rawData.forEach(item => {
    const nome = item.classe?.nome || 'Indefinido';
    contagem[nome] = (contagem[nome] || 0) + 1;
  });

  const dados = Object.entries(contagem).map(([categoria, valor]) => ({ categoria, valor }));

  // Dimensões
  const width = 500;
  const height = 300;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.categoria))
    .range(d3.schemeCategory10);

  const pie = d3.pie()
    .value(d => d.valor)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Limpa gráfico anterior
  const container = d3.select('#grafico-pizza-deslocado');
  container.select('svg').remove();

  const svg = container.append('svg')
    .attr('width', width + 200) // espaço extra para legenda
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${radius + 20}, ${height / 2})`);

  // Desenha os setores
  svg.selectAll('path')
    .data(pie(dados))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.categoria))
    .attr('stroke', '#fff')
    .attr('stroke-width', '1px');

  // Legenda
  const legenda = container.select('svg')
    .append('g')
    .attr('transform', `translate(${width}, 20)`);

  legenda.selectAll('rect')
    .data(dados)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d, i) => i * 22)
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => color(d.categoria));

  legenda.selectAll('text')
    .data(dados)
    .enter()
    .append('text')
    .attr('x', 24)
    .attr('y', (d, i) => i * 22 + 14)
    .text(d => d.categoria)
    .style('font-size', '13px');
}

export function criarGraficoClasse(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    contagem[classeNome] = (contagem[classeNome] || 0) + 1;
  });

  const dados = Object.entries(contagem)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.categoria))
    .range(d3.schemeTableau10.concat(d3.schemeSet3).slice(0, dados.length)); // paleta estendida

  const pie = d3.pie()
    .value(d => d.valor);

  const arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);

  const container = d3.select('#grafico-classes-todas');
  container.select('svg').remove(); // limpa visualizações anteriores

  // Garante que container possa posicionar a tooltip
  container.style("position", "relative");

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  // Tooltip invisível inicialmente
  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("box-shadow", "0px 2px 6px rgba(0,0,0,0.1)")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

  const arcs = svg.selectAll('arc')
    .data(pie(dados))
    .enter()
    .append('g');

  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.categoria))
    .on('mouseover', function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(`<strong>${d.data.categoria}</strong><br>${d.data.valor} processos`);
    })
    .on('mousemove', function (event) {
      tooltip
        .style("left", (event.offsetX + 10) + "px")
        .style("top", (event.offsetY - 10) + "px");
    })
    .on('mouseout', function () {
      tooltip.style("opacity", 0);
    });
}


export function criarGraficoClassesResumido(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    contagem[classeNome] = (contagem[classeNome] || 0) + 1;
  });

  // Converte contagem para array de objetos e calcula total
  const dados = Object.entries(contagem)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  const top5 = dados.slice(0, 5);
  const total = top5.reduce((acc, d) => acc + d.valor, 0);

  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(top5.map(d => d.categoria))
    .range(d3.schemeDark2);

  const pie = d3.pie()
    .value(d => d.valor)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);

  const container = d3.select('#grafico-rosquinha-classes');
  container.select('svg').remove();

  const svg = container
    .append('svg')
    .attr('width', width + 150) // espaço para legenda
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const arcs = svg.selectAll('arc')
    .data(pie(top5))
    .enter()
    .append('g');

  // Tooltip
  const tooltip = container.append("div")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("display", "none");

  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.categoria))
    .on('mouseover', function(event, d) {
      const percentual = ((d.data.valor / total) * 100).toFixed(2);
      tooltip
        .style('display', 'block')
        .html(`<strong>${d.data.categoria}</strong><br>${d.data.valor} processos (${percentual}%)`);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'));
/*
  arcs.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(d => d.data.categoria);
    */

  // Legenda deslocada para a direita
  const legenda = svg.append('g')
    .attr('transform', `translate(${radius + 20}, ${-radius})`);

  legenda.selectAll('rect')
    .data(top5)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d, i) => i * 25)
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => color(d.categoria));

  legenda.selectAll('text')
    .data(top5)
    .enter()
    .append('text')
    .attr('x', 24)
    .attr('y', (d, i) => i * 25 + 14)
    .text(d => `${d.categoria}`)
    .style('fill', 'white')
    .style('font-size', '13px')
    .style('cursor', 'default');
}




export function criarGraficoBarrasHorizontais(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    contagem[classeNome] = (contagem[classeNome] || 0) + 1;
  });

  const dadosParaGrafico = Object.entries(contagem)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 20); // Limita ao top 20

  // Dimensões
  const width = 600;
  const height = 20 * dadosParaGrafico.length + 40;
  const margin = { top: 20, right: 20, bottom: 20, left: 200 };

  const container = d3.select('#grafico-barras-horizontais-classes');
  container.select('svg').remove();

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(dadosParaGrafico.map(d => d.categoria))
    .range([0, height - margin.top - margin.bottom])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(dadosParaGrafico, d => d.valor)])
    .nice()
    .range([0, width - margin.left - margin.right]);

  // Eixos
  chart.append('g').call(d3.axisLeft(y));
  chart.append('g')
    .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5));

  // Barras
  chart.selectAll('.bar')
    .data(dadosParaGrafico)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('y', d => y(d.categoria))
    .attr('x', 0)
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.valor))
    .attr('fill', '#ff4040');
}



export function criarGraficoBarras(rawData) {
  // Agregação por classe.nome
  const contagem = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    contagem[classeNome] = (contagem[classeNome] || 0) + 1;
  });

  const dadosParaGrafico = Object.entries(contagem).map(
    ([categoria, valor]) => ({ categoria, valor })
  );

  // Dimensões
  const width = 500;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };

  const container = d3.select('#grafico-barras');
  container.select('svg').remove(); // limpa gráfico anterior, se existir

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(dadosParaGrafico.map(d => d.categoria))
    .range([0, width - margin.left - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dadosParaGrafico, d => d.valor)])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  // Eixos
  chart.append('g')
    .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end');

  chart.append('g')
    .call(d3.axisLeft(y));

  // Barras
  chart.selectAll('.bar')
    .data(dadosParaGrafico)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.categoria))
    .attr('y', d => y(d.valor))
    .attr('width', x.bandwidth())
    .attr('height', d => y(0) - y(d.valor))
    .attr('fill', '#69b3a2');
}

export function criarGraficoClasses(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    contagem[classeNome] = (contagem[classeNome] || 0) + 1;
  });

  const dadosParaGrafico = Object.entries(contagem).map(
    ([categoria, valor]) => ({ categoria, valor })
  );

  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dadosParaGrafico.map(d => d.categoria))
    .range(d3.schemeCategory10);

  const pie = d3.pie()
    .value(d => d.valor);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const container = d3.select('#grafico-pizza');
  container.select('svg').remove();

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const arcs = svg.selectAll('arc')
    .data(pie(dadosParaGrafico))
    .enter()
    .append('g');

  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.categoria));

  arcs.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .text(d => d.data.categoria);
}

export function criarGraficoOrgaosJulgadores(rawData) {
    const contagem = {};

  rawData.forEach(item => {
    const codigo = item.orgaoJulgador?.codigo || 'Indefinido';
    contagem[codigo] = (contagem[codigo] || 0) + 1;
  });

  const dados = Object.entries(contagem)
    .map(([codigo, valor]) => ({ codigo, valor }))
    .sort((a, b) => b.valor - a.valor);

  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const container = d3.select("#grafico-orgaos-julgadores");
  container.select("svg").remove();

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleBand()
    .domain(dados.map(d => d.codigo))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dados, d => d.valor)])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-20)")
    .style("text-anchor", "end")
    .style("font-size", "10px");

  svg.selectAll("rect")
    .data(dados)
    .enter()
    .append("rect")
    .attr("x", d => x(d.codigo))
    .attr("y", d => y(d.valor))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.valor))
    .attr("fill", "#4682b4");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Quantidade de Processos por Código do Órgão Julgador");
}

export function criarGraficoPizzaTopAssuntos(rawData, quantidadeTop, containerId) {
  const contagem = {};

  rawData.forEach(item => {
    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const nome = assunto?.nome || 'Indefinido';
          contagem[nome] = (contagem[nome] || 0) + 1;
        } catch {
          contagem['Indefinido'] = (contagem['Indefinido'] || 0) + 1;
        }
      });
    }
  });

  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  const dados = Object.entries(contagem)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, quantidadeTop);

  const margin = { top: 20, right: 30, bottom: 20, left: 180 };
  const width = 700 - margin.left - margin.right;
  const height = 40 * dados.length;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.nome))
    .range(d3.schemeCategory10);

  const container = d3.select(`#${containerId}`);
  container.selectAll("*").remove();

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(dados.map(d => d.nome))
    .range([0, height])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(dados, d => d.valor)])
    .nice()
    .range([0, width]);

  const tooltip = container.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.75)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("z-index", "1000");

  // Eixo Y (nomes)
  svg.append("g")
    .call(d3.axisLeft(y));

  // Eixo X
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(5));

  // Barras
  svg.selectAll("rect")
    .data(dados)
    .enter()
    .append("rect")
    .attr("y", d => y(d.nome))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.valor))
    .attr("fill", d => color(d.nome))
    .on("mouseover", function(event, d) {
      const percent = ((d.valor / total) * 100).toFixed(1);
      tooltip
        .style("display", "block")
        .html(`<strong>${d.nome}</strong><br>${d.valor} processos<br>${percent}%`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));
}


export function criarMosaicoAssuntos(rawData) {
  // Contagem dos assuntos
  const contagem = {};
  rawData.forEach(item => {
    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const nome = assunto?.nome || 'Indefinido';
          contagem[nome] = (contagem[nome] || 0) + 1;
        } catch {
          contagem['Indefinido'] = (contagem['Indefinido'] || 0) + 1;
        }
      });
    }
  });

  // Converte em array ordenado e corta os 50 maiores
  const dados = Object.entries(contagem)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 50);

  // Função que desenha o mosaico
  function desenharMosaico(containerId, width, height) {
    const container = d3.select(containerId);
    container.selectAll("*").remove();

    // Remove tooltip antiga, se existir
    container.select(".tooltip").remove();

    // Cria tooltip dentro do container (posição absoluta relativa ao container)
    const tooltip = container.append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "6px 8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("z-index", "1000");

    const svg = container.append("svg")
      .attr("width", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto")
      .style("position", "relative");

    const root = d3.hierarchy({ children: dados })
      .sum(d => d.valor);

    d3.treemap()
      .size([width, height])
      .padding(2)(root);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const nodes = svg.selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodes.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => color(d.data.nome))
      .on("mouseover", function(event, d) {
        tooltip.style("display", "block")
          .html(`<strong>${d.data.nome}</strong><br>${d.data.valor} processos`);
      })
      .on("mousemove", function(event) {
        // Usa d3.pointer para posição relativa ao container
        const [x, y] = d3.pointer(event, container.node());
        tooltip.style("left", (x + 10) + "px")
               .style("top", (y - 28) + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    nodes.each(function(d) {
      const group = d3.select(this);
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;
      const words = d.data.nome.split(" ");
      const fontSize = 10;
      let line = '';
      const lines = [];
      const maxLineLength = rectWidth / (fontSize * 0.6);

      words.forEach(word => {
        if ((line + word).length < maxLineLength) {
          line += word + ' ';
        } else {
          lines.push(line.trim());
          line = word + ' ';
        }
      });
      if (line) lines.push(line.trim());

      const yStart = 14;
      const lineHeight = 12;
      const totalHeight = lines.length * lineHeight;

      if (totalHeight < rectHeight) {
        lines.forEach((l, i) => {
          group.append("text")
            .attr("x", 4)
            .attr("y", yStart + i * lineHeight)
            .attr("font-size", `${fontSize}px`)
            .attr("fill", "white")
            .text(l);
        });
      }
    });
  }

  // Desenha mosaico inicial
  desenharMosaico("#grafico-mosaico-assuntos", 800, 300);

  // Evento clique para abrir modal
  d3.select("#grafico-mosaico-assuntos").on("click", () => {
    const modal = document.getElementById("modal");
    modal.style.display = "flex";
    desenharMosaico("#grafico-mosaico-ampliado", 1200, 700);
  });

  // Evento fechar modal (apenas registra uma vez)
  const btnFechar = document.getElementById("btn-fechar");
  if (btnFechar && !btnFechar._eventRegistered) {
    btnFechar.addEventListener("click", () => {
      document.getElementById("modal").style.display = "none";
      d3.select("#grafico-mosaico-ampliado").selectAll("*").remove();
    });
    btnFechar._eventRegistered = true;
  }
}


export function criarGraficoPizzaAssuntos(rawData) {
  const contagem = {};

  rawData.forEach(item => {
    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const nome = assunto?.nome?.trim() || 'Indefinido';
          contagem[nome] = (contagem[nome] || 0) + 1;
        } catch {
          contagem['Indefinido'] = (contagem['Indefinido'] || 0) + 1;
        }
      });
    }
  });

  const dados = Object.entries(contagem)
    .map(([nome, valor]) => ({
      nome,
      valor,
      classeLegenda: 'legenda-' + nome.replace(/\s+/g, '-').toLowerCase().replace(/[^\w-]/g, '')
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15);

  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dados.map(d => d.nome))
    .range(d3.schemeCategory10);

  const container = d3.select('#grafico-pizza-assuntos');
  container.selectAll('*').remove();

  const wrapper = container.append('div')
    .style('display', 'flex')
    .style('align-items', 'start')
    .style('gap', '30px')
    .style('position', 'relative');

  const svg = wrapper.append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d.valor).sort(null);
  const arc = d3.arc().outerRadius(radius).innerRadius(0);
  const arcHover = d3.arc().outerRadius(radius + 10).innerRadius(0);

  const tooltip = container.append('div')
    .style('position', 'absolute')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('font-size', '13px')
    .style('pointer-events', 'none')
    .style('display', 'none');

  // Desenha as fatias
  const paths = svg.selectAll('path')
    .data(pie(dados))
    .enter()
    .append('path')
    .attr('fill', d => color(d.data.nome))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .transition()
    .duration(800)
    .attrTween('d', function(d) {
      const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
      return t => arc({ ...d, endAngle: i(t) });
    });

  // Reatribui os eventos após a transição
  svg.selectAll('path')
    .data(pie(dados))
    .on('mouseover', function(event, d) {
      d3.select(this).transition().duration(200).attr('d', arcHover);

      tooltip
        .style('display', 'block')
        .html(`<strong>${d.data.nome}</strong><br>${d.data.valor} processos`);

      d3.select(`.${d.data.classeLegenda}`)
        .style('font-weight', 'bold')
        .style('background-color', '#444cf7');
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function(event, d) {
      d3.select(this).transition().duration(200).attr('d', arc(d));
      tooltip.style('display', 'none');

      d3.select(`.${d.data.classeLegenda}`)
        .style('font-weight', null)
        .style('background-color', null);
    });

  // Legenda
  const legenda = wrapper.append('div')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('gap', '8px')
    .style('font-size', '13px')
    .style('margin-top', '12px');

  legenda.selectAll('div')
    .data(dados)
    .enter()
    .append('div')
    .attr('class', d => d.classeLegenda)
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '8px')
    .html(d => `
      <span style="width: 14px; height: 14px; border-radius: 3px; background:${color(d.nome)};"></span>
      <span>${d.nome} (${d.valor})</span>
    `);
}


export function criarScatterPlotProcessos(rawData) {
  const container = d3.select('#grafico-scatter-processos');
  container.selectAll('*').remove();

  const width = window.innerWidth;
  const height = 600;
  const pontoRaio = 3;

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#000');

  const pontos = [];

  rawData.forEach(item => {
    const classeNome = item.classe?.nome || 'Indefinido';
    if (Array.isArray(item.assuntos)) {
      item.assuntos.forEach(assuntoStr => {
        try {
          const assunto = JSON.parse(assuntoStr);
          const assuntoNome = assunto?.nome || 'Indefinido';
          pontos.push({
            classe: classeNome,
            assunto: assuntoNome,
            numeroProcesso: item.numeroProcesso || '',
            id: item.id || '',
          });
        } catch {}
      });
    }
  });

  const topAssuntos = [...new Set(pontos.map(d => d.assunto))].slice(0, 15);
  const topClasses = [...new Set(pontos.map(d => d.classe))].slice(0, 15);

  const dadosFiltrados = pontos.filter(d =>
    topAssuntos.includes(d.assunto) && topClasses.includes(d.classe)
  );

  const clusterKey = d => `${d.classe}||${d.assunto}`;
  const clusters = [...new Set(dadosFiltrados.map(clusterKey))];

  // Gera posições aleatórias para clusters sem sobreposição
  const clusterPositions = {};
  const usados = [];

  function distancia(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  clusters.forEach((key, i) => {
    let pos, ok = false, tentativas = 0;
    while (!ok && tentativas < 200) {
      pos = {
        x: Math.random() * (width - 200) + 100,
        y: Math.random() * (height - 200) + 100
      };
      ok = usados.every(p => distancia(p, pos) > 100);
      tentativas++;
    }
    usados.push(pos);
    clusterPositions[key] = pos;
  });

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(clusters);

  const tooltip = container.append('div')
    .style('position', 'absolute')
    .style('background', '#333')
    .style('color', '#fff')
    .style('padding', '6px 10px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('display', 'none');

  const grouped = {};
  dadosFiltrados.forEach(d => {
    const key = clusterKey(d);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  Object.entries(grouped).forEach(([key, group]) => {
    const base = clusterPositions[key];
    const raioMax = 40;

    group.forEach((d, i) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = raioMax * Math.sqrt(Math.random()); // mais pontos no centro
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      svg.append('circle')
        .attr('cx', base.x + dx)
        .attr('cy', base.y + dy)
        .attr('r', pontoRaio)
        .attr('fill', color(key))
        .attr('opacity', 0.7)
        .on('mouseover', function (event) {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
          tooltip
            .style('display', 'block')
            .html(`<strong>Processo:</strong> ${d.numeroProcesso}<br><strong>Classe:</strong> ${d.classe}<br><strong>Assunto:</strong> ${d.assunto}`);
        })
        .on('mousemove', event => {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke', null);
          tooltip.style('display', 'none');
        });
    });
  });
}





export function criarMosaicoClasseAssuntoMovimento(data) {
const contagem = {};

  data.forEach(item => {
    // Extrai o nome do órgão julgador, com fallback
    const orgao = item.orgaoJulgador?.nome || 'Sem órgão';

    // Conta um processo por órgão
    contagem[orgao] = (contagem[orgao] || 0) + 1;
  });

  const root = {
    name: 'root',
    children: Object.entries(contagem).map(([orgao, valor]) => ({
      name: orgao,
      value: valor
    }))
  };

  const width = 400;
  const height = 500;

  const container = d3.select("#grafico-mosaico");
  container.select("svg").remove();

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const rootNode = d3.hierarchy(root).sum(d => d.value);

  d3.treemap()
    .size([width, height])
    .paddingInner(1)(rootNode);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const nodes = svg.selectAll("g")
    .data(rootNode.leaves())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => color(d.data.name));

  nodes.append("title")
    .text(d => `${d.data.name}\nQuantidade de Processos: ${d.data.value}`);

  nodes.append("text")
    .attr("x", 4)
    .attr("y", 14)
    .text(d => d.data.name)
    .attr("font-size", "10px")
    .attr("fill", "white")
    .style("pointer-events", "none")
    .each(function(d) {
      const rectWidth = d.x1 - d.x0;
      const text = d3.select(this);
      if (text.node().getComputedTextLength() > rectWidth - 4) {
        text.text(text.text().slice(0, 10) + '…');
      }
    });
  
    
  
  }
