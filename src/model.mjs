// The learning bridge behind the figure: the one model every readout, row and puck reads from.
export const HOSTS = "ABCDEFGH".split("").map((name, port) => ({ name, port, mac: "00:0" + name }));

export const newTable = () => [];

// A frame arrives on `srcPort` addressed to host `dst`.
// 1. Learn: the source MAC is written (or its port corrected) in the table.
// 2. Look up the destination: a hit goes out of one port, a miss floods every other port.
export function handle(table, srcPort, dst) {
  const src = HOSTS[srcPort];
  let row = table.findIndex((entry) => entry.mac === src.mac);
  let learned = "known";
  if (row < 0) {
    table.push({ mac: src.mac, port: srcPort });
    row = table.length - 1;
    learned = "new";
  } else if (table[row].port !== srcPort) {
    table[row].port = srcPort;
    learned = "moved";
  }
  const hit = table.findIndex((entry) => entry.mac === HOSTS[dst].mac);
  let action = "flood";
  let out = HOSTS.map((host) => host.port).filter((port) => port !== srcPort);
  if (hit >= 0) {
    const port = table[hit].port;
    action = port === srcPort ? "filter" : "forward";
    out = port === srcPort ? [] : [port];
  }
  return { src: srcPort, dst, srcRow: row, learned, hitRow: hit, action, out };
}

// A short conversation that shows every case: flood, forward, learn.
export const TOUR = [
  [0, 3],
  [3, 0],
  [5, 0],
  [0, 5],
  [7, 2],
  [2, 7],
];

export const sayLookup = (job) => {
  const src = HOSTS[job.src];
  const dst = HOSTS[job.dst];
  const learn = job.learned === "new" ? `learn ${src.name} = port ${job.src + 1}` : `${src.name} is on port ${job.src + 1}`;
  return job.hitRow < 0 ? `${learn} · ${dst.name} unknown` : `${learn} · ${dst.name} is on port ${job.out[0] + 1}`;
};

export const sayOut = (job) =>
  job.action === "flood" ? `flood to ${job.out.length} ports` : job.action === "forward" ? `forward to port ${job.out[0] + 1} only` : "same segment, dropped";
