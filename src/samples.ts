export type DraftClause = {
  number: string;
  title: string;
  body: string;
};

export type SamplePair = {
  id: string;
  name: string;
  blurb: string;
  original: DraftClause[];
  revised: DraftClause[];
};

const ndaOriginal: DraftClause[] = [
  {
    number: "1",
    title: "Purpose",
    body: "The parties wish to evaluate a possible business relationship and may share non-public information for that purpose only.",
  },
  {
    number: "2",
    title: "Confidential Information",
    body: '"Confidential Information" means non-public business information disclosed by either party, excluding information that is or becomes public other than by breach of this Agreement.',
  },
  {
    number: "3",
    title: "Obligations",
    body: "The Receiving Party shall protect Confidential Information using reasonable care and shall use it only for the Purpose.",
  },
  {
    number: "4",
    title: "Term",
    body: "This Agreement remains in effect for two (2) years from the Effective Date.",
  },
  {
    number: "5",
    title: "Return of Materials",
    body: "Upon request, the Receiving Party shall return or destroy all Confidential Information.",
  },
  {
    number: "6",
    title: "Indemnity",
    body: "Each party shall indemnify the other against third-party claims arising from its breach of this Agreement.",
  },
  {
    number: "7",
    title: "Assignment",
    body: "Neither party may assign this Agreement without the prior written consent of the other party.",
  },
  {
    number: "8",
    title: "Governing Law",
    body: "This Agreement is governed by the laws of the State of Delaware.",
  },
  {
    number: "9",
    title: "Notices",
    body: "Notices shall be sent by certified mail to the addresses on the signature page.",
  },
  {
    number: "10",
    title: "Entire Agreement",
    body: "This Agreement, including Section 9, is the entire agreement between the parties and supersedes prior discussions about the same subject.",
  },
];

const ndaRevised: DraftClause[] = [
  ndaOriginal[0],
  {
    number: "2",
    title: "Confidential Information",
    body: '"Confidential Information" means any and all non-public business, technical, and financial information disclosed by either party, including without limitation notes and derivatives, excluding information that is or becomes public other than by breach of this Agreement.',
  },
  {
    number: "3",
    title: "Obligations",
    body: "The Receiving Party shall protect Confidential Information using reasonable care and shall use it only for the Purpose. Upon request, the Receiving Party shall return or destroy all Confidential Information.",
  },
  {
    number: "4",
    title: "Notices",
    body: "Notices shall be sent by overnight courier to the addresses on the signature page.",
  },
  {
    number: "5",
    title: "Term",
    body: "This Agreement remains in effect for one (1) year from the Effective Date and shall automatically renew for successive one (1) year terms unless either party gives written notice of non-renewal at least thirty (30) days before the then-current term ends.",
  },
  {
    number: "6",
    title: "Indemnity",
    body: "The Receiving Party shall indemnify the Disclosing Party against any and all claims arising from its breach of this Agreement, and its liability shall be unlimited for consequential damages.",
  },
  {
    number: "7",
    title: "Assignment",
    body: "The Disclosing Party may assign this Agreement without the consent of the Receiving Party, including to an affiliate.",
  },
  {
    number: "8",
    title: "Governing Law",
    body: "This Agreement is governed by the laws of the State of New York, and each party waives its right to a jury trial.",
  },
  {
    number: "9",
    title: "Entire Agreement",
    body: "This Agreement, including Section 9, is the entire agreement between the parties and supersedes prior discussions about the same subject.",
  },
];

const saasOriginal: DraftClause[] = [
  {
    number: "1",
    title: "Services",
    body: "Northline Software LLC will provide the hosted workspace described in this Order Form to Customer.",
  },
  {
    number: "2",
    title: "Fees",
    body: "Customer shall pay $18,000 per year, due net thirty (30) days from the invoice date.",
  },
  {
    number: "3",
    title: "Term",
    body: "The initial term is twelve (12) months and does not automatically renew.",
  },
  {
    number: "4",
    title: "Limitation of Liability",
    body: "Vendor's aggregate liability is capped at the fees paid under this Order in the prior twelve (12) months.",
  },
  {
    number: "5",
    title: "Governing Law",
    body: "This Order is governed by the laws of the State of California.",
  },
];

const saasRevised: DraftClause[] = [
  saasOriginal[0],
  {
    number: "2",
    title: "Fees",
    body: "Customer shall pay $24,000 per year, due net thirty (30) days from the invoice date.",
  },
  {
    number: "3",
    title: "Term",
    body: "The initial term is twelve (12) months and shall automatically renew for successive twelve (12) month terms unless Customer gives written notice of non-renewal.",
  },
  {
    number: "4",
    title: "Limitation of Liability",
    body: "Customer's liability shall be unlimited. Vendor's aggregate liability is capped at the fees paid under this Order in the prior twelve (12) months.",
  },
  {
    number: "5",
    title: "Assignment",
    body: "Vendor may assign this Order without the consent of Customer.",
  },
  {
    number: "6",
    title: "Governing Law",
    body: "This Order is governed by the laws of the State of Texas. Venue and notices under Section 7 shall follow the Vendor's then-current address.",
  },
];

const contractorOriginal: DraftClause[] = [
  {
    number: "1",
    title: "Services",
    body: "Contractor will design the Harbor Street wayfinding sketches described in the statement of work.",
  },
  {
    number: "2",
    title: "Payment",
    body: "Client shall pay a fixed fee of $8,500, half on signature and half on delivery.",
  },
  {
    number: "3",
    title: "Term",
    body: "This Agreement ends six (6) months after the Effective Date unless the work is delivered sooner.",
  },
  {
    number: "4",
    title: "Intellectual Property",
    body: "Upon payment in full, Client owns the final deliverables. Contractor keeps its pre-existing tools.",
  },
  {
    number: "5",
    title: "Limitation of Liability",
    body: "Each party's aggregate liability is capped at the fees paid under this Agreement.",
  },
  {
    number: "6",
    title: "Governing Law",
    body: "This Agreement is governed by the laws of the State of Illinois.",
  },
];

const contractorRevised: DraftClause[] = [
  contractorOriginal[0],
  {
    number: "2",
    title: "Payment",
    body: "Client shall pay a fixed fee of $11,000, half on signature and half on delivery.",
  },
  {
    number: "3",
    title: "Term",
    body: "This Agreement ends one (1) month after the Effective Date and shall automatically renew for successive one (1) month terms until Client gives notice.",
  },
  {
    number: "4",
    title: "Intellectual Property",
    body: "Contractor owns the deliverables and grants Client a non-exclusive license to use them for the Harbor Street project only.",
  },
  {
    number: "5",
    title: "Non-Solicit",
    body: "Client shall not solicit Contractor's employees during the term and for one (1) year after it ends.",
  },
  {
    number: "6",
    title: "Governing Law",
    body: "This Agreement is governed by the laws of the State of New York, and each party waives its right to a jury trial.",
  },
  {
    number: "7",
    title: "Assignment",
    body: "Contractor may assign this Agreement without the consent of Client.",
  },
];

export const SAMPLES: SamplePair[] = [
  {
    id: "nda",
    name: "Mutual NDA",
    blurb: "Fictional draft. Notices moves, a sentence moves, and Section 9 goes stale.",
    original: ndaOriginal,
    revised: ndaRevised,
  },
  {
    id: "saas",
    name: "SaaS order form",
    blurb: "Fictional order. Auto-renewal, a new assignment clause, and a missing section cite.",
    original: saasOriginal,
    revised: saasRevised,
  },
  {
    id: "contractor",
    name: "Contractor agreement",
    blurb: "Fictional services deal. Term shrinks, IP flips, and a jury waiver appears.",
    original: contractorOriginal,
    revised: contractorRevised,
  },
];
