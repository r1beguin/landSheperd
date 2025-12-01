// NITROGEN BUDGET CALCULATION

const RAIN_N_PER_DAY = 0.1;
const OM_DECAY_PER_DAY = 0.3;
const N_RELEASE_RATIO = 0.4;

const TOTAL_N_CONSUMED = 5 + 15 + 20; // 40 N per plant lifecycle
const LIFECYCLE_DAYS = 25;

const rain_n_total = RAIN_N_PER_DAY * LIFECYCLE_DAYS;
const om_decayed = OM_DECAY_PER_DAY * LIFECYCLE_DAYS;
const n_from_om = om_decayed * N_RELEASE_RATIO;
const WITHERED_N_RETURN = 8;

const total_n_input = rain_n_total + n_from_om + WITHERED_N_RETURN;
const net_n_balance = total_n_input - TOTAL_N_CONSUMED;

console.log('=== NITROGEN PER PLANT LIFECYCLE (25 days) ===');
console.log('Rain: ' + rain_n_total.toFixed(1) + ' N');
console.log('OM decomp: ' + n_from_om.toFixed(1) + ' N');
console.log('Death return: ' + WITHERED_N_RETURN + ' N');
console.log('Total input: ' + total_n_input.toFixed(1) + ' N');
console.log('Plant consumed: ' + TOTAL_N_CONSUMED + ' N');
console.log('NET: ' + (net_n_balance >= 0 ? '+' : '') + net_n_balance.toFixed(1) + ' N\n');

const GRID_SIZE = 2500;
const SIMULATION_DAYS = 100;
const PLANTS_DAY_100 = 64;

const rain_n_grid = RAIN_N_PER_DAY * SIMULATION_DAYS * GRID_SIZE;
const om_n_grid = OM_DECAY_PER_DAY * N_RELEASE_RATIO * SIMULATION_DAYS * GRID_SIZE;
const plant_n_consumed = TOTAL_N_CONSUMED * PLANTS_DAY_100;

console.log('=== GRID-WIDE (100 days, 2500 cells, 64 plants) ===');
console.log('Rain N (ALL cells):    +' + rain_n_grid.toFixed(0) + ' N');
console.log('OM decomp (ALL cells): +' + om_n_grid.toFixed(0) + ' N');
console.log('Plants consume:        -' + plant_n_consumed + ' N');
console.log('NET: +' + (rain_n_grid + om_n_grid - plant_n_consumed).toFixed(0) + ' N\n');

const ratio = (rain_n_grid + om_n_grid) / plant_n_consumed;
console.log('*** INPUT IS ' + ratio.toFixed(1) + 'x CONSUMPTION! ***');
