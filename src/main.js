import { Dados } from "./dados";
import {criarGraficoLinhaAjuizamento, criarGraficoClasse, criarGraficoOrgaosJulgadores, criarMosaicoClasseAssuntoMovimento, criarGraficoPizzaTopAssuntos,
    criarHeatMap, criarGraficoBolhasTop, criarGraficoBarrasAssuntos, criarGraficoClasses, criarGraficoPizzaAssuntos, criarMosaicoAssuntos,
    criarGraficoBarras, criarGraficoBarrasHorizontais, criarGraficoClassesResumido, criarGraficoPizzaComLabelDeslocado, 
    criarGraficoPizzaTop5Deslocado, criarGraficoPorGrau, criarScatterPlotProcessos} from './plot.js';

window.onload = async () => {

    document.getElementById("modal").style.display = "none";

    const dadosJudiciario = new Dados();

    await dadosJudiciario.init();
    await dadosJudiciario.carregar();

    const sql = `
        SELECT
            *
        FROM
            dados_tjrj
    `;

    const data = await dadosJudiciario.consultar(sql);

    

    
    ///criarGraficoClasses(data);
    criarGraficoBarras(data);
    criarGraficoBarrasHorizontais(data);
    criarGraficoClasse(data);
    criarGraficoClassesResumido(data);
    criarGraficoPizzaComLabelDeslocado(data)
    criarGraficoPizzaTop5Deslocado(data);
    criarGraficoPorGrau(data);
    criarGraficoBarrasAssuntos(data);
    criarGraficoBolhasTop(data);
    criarHeatMap(data);
    criarGraficoLinhaAjuizamento(data);
    criarGraficoOrgaosJulgadores(data);
    criarMosaicoClasseAssuntoMovimento(data);
    criarGraficoPizzaAssuntos(data);
    criarMosaicoAssuntos(data);
    criarScatterPlotProcessos(data);


    console.log(data[0].assuntos.nome);

};
