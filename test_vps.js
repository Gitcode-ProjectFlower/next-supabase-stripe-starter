const url = process.env.HAYSTACK_BASE_URL || 'http://207.180.237.68:8000';

const payload = {
  selection_items: [
    {
      doc_id: "test-123",
      name: "Bishop Fraser Trust",
      domain: "thebishopfrasertrust.co.uk",
    }
  ],
  standard_question_id: "1",
  prompt: "You are a B2B sales analyst.",
  form_input: {
    productName: "CRM",
    icpSignals: ["B2B", "Enterprise"]
  },
  collection: "collection_uk",
  top_k: 12
};

console.log(`Sending request to ${url}/qa/standard...`);

fetch(`${url}/qa/standard`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
})
  .then(res => {
    console.log(`Status: ${res.status}`);
    return res.text();
  })
  .then(data => console.log(`Response: \n${data}`))
  .catch(err => console.error('Error fetching from VPS:', err));
