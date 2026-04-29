const MAX_PATH_LENGTH = 5000;
const ANTS = 100;

const Dist = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));

class Grid {
    #cells;
    constructor(width, height){
        this.width = width;
        this.height = height;
        this.#cells = {};
        this.#prepare();
        this.max_pheromones = 0;
    }
    #prepare(){
        const colony_pos = [Math.round(this.width * 0.15), Math.round(this.height / 2)];
        const food_pos = this.#foodPos(colony_pos);

        this.colony = new Colony(this, colony_pos[0], colony_pos[1], ANTS);

        for(let x = 0; x < this.width; x++){
            for(let y = 0; y < this.height; y++){
                let type;
                if(x == colony_pos[0] && y == colony_pos[1]) type = "colony";
                else if(x == food_pos[0] && y == food_pos[1]) type = "food";
                else if(Dist(colony_pos[0], colony_pos[1], x, y) < 2 || Dist(food_pos[0], food_pos[1], x, y) < 2) type = "normal";
                else type = (Math.random() < 0.85 ? "normal" : "obstacle");
                this.#cells[`${x} ${y}`] = new GridCell(this, x, y, food_pos, type);
            }
        }
    }
    #foodPos(colony_pos){
        let pos = [Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height)];
        while(Dist(colony_pos[0], colony_pos[1], pos[0], pos[1]) < Math.min(this.width, this.height) / 2){
            pos = [Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height)];
        }
        return pos;
    }
    getCell(x, y){
        return this.#cells[`${x} ${y}`] ? this.#cells[`${x} ${y}`] : null;
    }
    getCellById(id) {
        return this.#cells[id] ? this.#cells[id] : null;
    }
    print(){
        let display = "";
        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){
                const cell = this.getCell(x, y);
                if(cell.type == "food") display += "F";
                else if(cell.type == "colony") display += "C";
                else if(cell.type == "obstacle") display += "X";
                else display += "O";
                if(x < this.width - 1) display += " ";
            }
            if(y < this.height - 1) display += "\n\n";
        }
        console.log(display);
    }
    step(){
        let max = 0;
        Object.keys(this.#cells).forEach(k => {
            const cell = this.#cells[k];
            cell.step();
            if(cell.pheromones > max) max = cell.pheromones;
        })
        this.max_pheromones = max;
    }
}

class GridCell {
    constructor(grid, x, y, food_pos, type="normal"){
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.type = type;
        this.pheromones = 0;
    }
    addPheromones(ph){
        this.pheromones += ph;
    }
    step(){
        this.pheromones *= 0.85;
    }
}

class Colony {
    constructor(grid, x, y, size){
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.size = size;
        this.populate(this.size);
    }
    populate(){
        this.ants = [];
        this.ants_finished = 0;
        for(let i = 0; i < this.size; i++) this.ants.push(new Ant(this.grid, this, this.x, this.y));
    }
    iteration(){
        this.ants.forEach(ant => {
            while(!ant.finished){
                ant.move();
            }
        });
    }
    update(){
        const finished = this.ants.filter(ant => ant.finished);
        this.ants_finished = finished.length;
        
        if(this.ants_finished < this.ants.length) return;
        
        this.grid.step();
        const found = this.ants.filter(ant => ant.found_food);
        found.forEach(ant => ant.layPheromones());
        this.populate();
    }
}

class Ant {
    constructor(grid, colony, x, y){
        this.grid = grid;
        this.colony = colony;
        this.x = x;
        this.y = y;
        this.path = [];
        this.finished = false;
        this.found_food = false;
    }
    #validateCell(x, y, check_trap=true){
        const cell = this.grid.getCell(x, y);
        if(!cell) return false;
        if(cell.type == "obstacle") return false;
        if(this.path.indexOf(`${x} ${y}`) != -1) return false;
        if(check_trap){
            if(this.#anticipateTrap(x, y)) return false;
        }
        return true;
    }
    #anticipateTrap(x, y){
        let validCells = 0;
        if(this.#validateCell(x, y + 1, false)) return false;
        if(this.#validateCell(x + 1, y, false)) return false;
        if(this.#validateCell(x - 1, y, false)) return false;
        if(this.#validateCell(x, y - 1, false)) return false;
        return true;
    }
    calcProbs(){
        const cells = [];
        if(this.#validateCell(this.x, this.y + 1)) cells.push({cell: this.grid.getCell(this.x, this.y + 1), prob: 0});
        if(this.#validateCell(this.x + 1, this.y)) cells.push({cell: this.grid.getCell(this.x + 1, this.y), prob: 0});
        if(this.#validateCell(this.x - 1, this.y)) cells.push({cell: this.grid.getCell(this.x - 1, this.y), prob: 0});
        if(this.#validateCell(this.x, this.y - 1)) cells.push({cell: this.grid.getCell(this.x, this.y - 1), prob: 0});
        if(cells.length == 0){ // The ant trapped itself

        }
        const MIN_PHEROMONES = 0.001;
        const total = cells.reduce((total, current) => total + Math.max(MIN_PHEROMONES, current.cell.pheromones), 0);
        cells.forEach(c => {
            c.prob = Math.max(MIN_PHEROMONES, c.cell.pheromones) / total;
        });
        return cells;
    }
    move(){
        this.path.push(`${this.x} ${this.y}`);
        if(this.path.length >= MAX_PATH_LENGTH) return this.onFinish(false);
        const cells = this.calcProbs();
        if(cells.length == 0) return this.onFinish(false); // Trapped itself
        if(cells.filter(c => c.cell.type == "food").length > 0) return this.onFinish(true);
        let next = Math.random();
        let nextCell = null;
        let cumulative = 0;
        for(let c = 0; c < cells.length; c++){
            //console.log(next, cumulative, cumulative + cells[c].prob);
            if(cumulative + cells[c].prob >= next){
                nextCell = cells[c].cell;
                break;
            }
            cumulative += cells[c].prob;
        }
        if(nextCell == null) {
            console.log("N");
        }
        this.x = nextCell.x;
        this.y = nextCell.y;
    }
    onFinish(found_food=true){
        this.finished = true;
        this.found_food = found_food;
        this.colony.update();
    }
    layPheromones(){
        const phPerCell = 5 / this.path.length;
        this.path.forEach(c => {
            const cell = this.grid.getCellById(c);
            cell.addPheromones(phPerCell);
        })
    }
}