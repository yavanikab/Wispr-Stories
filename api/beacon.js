export default function handler(req, res) {
  var d = process.env.WS_Acknowledged_Logs;
  if (!d) { res.status(204).end(); return; }
  res.writeHead(302, { Location: d });
  res.end();
}
