export default function handler(req, res) {
  var d = process.env.WS_EP;
  if (!d) { res.status(204).end(); return; }
  res.writeHead(302, { Location: d });
  res.end();
}
