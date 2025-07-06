import { loadDb } from './config.js';

export class Dados {
    async init() {
        this.db = await loadDb();
        this.conn = await this.db.connect();
        this.table = 'tjrj';
    }

    async carregar() {
        const res = await fetch('tjrj.json');
        const json = await res.json();

        // Extrai só os objetos _source
        const dadosUteis = json.hits.hits.map(hit => hit._source);

        // Transforma em string e depois em buffer para DuckDB
        const buffer = new TextEncoder().encode(JSON.stringify(dadosUteis));

        // Registra o buffer no DuckDB com nome arbitrário
        await this.db.registerFileBuffer('dados_processado', buffer);

        // Cria tabela a partir do JSON processado
        await this.conn.query(`
            CREATE TABLE dados_tjrj AS
            SELECT * FROM read_json_auto('dados_processado');

            
    `);
}

    async consultar(sql) {
        const resultado = await this.conn.query(sql);
        const linhas = resultado.toArray().map(row => row.toJSON());

        return JSON.parse(JSON.stringify(linhas, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        }

}