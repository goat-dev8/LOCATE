const base = "https://locate-api-znz1.onrender.com";
const signatures = [
  "2PgXCZhh2HiGDguNVFka1JKhjoPxyGeBoWv4acS5uNB3vMiGHnLVHjqJFf2DfcHyAczEa6tWSgcrvQEikqVstyTi",
  "5dE2AyTW8quE1hjKjJZrHjBTocmRb9HnSommsF9toyjraF27TdvtzKnKgw4K3cFmq6gkajz9Get5KhnyvcxHyq4w",
  "2of8HQPVcY2XpjJCHcs95uho9W5UuACwonPCDDdAJuWYco6JPKM9kF2q4t6NAST2nFRyeuphytcHYY2hxH5hXEP7",
  "eepbfCzTp2YsHdDBdRvqjjGHEuqAFyAyDovnq9GL5RYtkni99p5pKoHYnqNMyJ5r88hQoDWw6MyknUsDFUXF1ep",
  "64scdqzbA3jooNoDZKWQLTsY24joDkWft6enWBKqR1G318G7QqALm7WjFbTbGFKrnZHqcXj3kLqQxtZuEsE3GNaA",
  "653KdWNMynZzpronirJKQTHhFybZsi7PUGfhPaa4zp4QcfeHXmt9ecvvKP5dDDFQs9D9eR7zKbDSctQ4rhNZkxkq",
  "2Sv4qQGyugUn96oe41SikzPtsSGPAN2RrKWhB41FYfqgpVMmGN56WFzM7kESSzci3aamX39cethDPZuQP2VZGgx4",
];
for (const signature of signatures) {
  const response = await fetch(base + "/v1/receipts/" + signature, { method: "POST" });
  const body = await response.json();
  console.log(response.status, body.status ?? body.error ?? body.code, signature.slice(0, 8));
  await new Promise((resolve) => setTimeout(resolve, 400));
}
const evidence = await fetch(base + "/v1/evidence");
const listed = await evidence.json();
console.log("evidence", evidence.status, Array.isArray(listed.receipts) ? listed.receipts.length : Object.keys(listed).length);
