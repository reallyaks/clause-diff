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
    body: "The Receiving Party shall use best endeavours to keep Confidential Information confidential and shall use it only for the Purpose.",
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
    body: "This Agreement is governed by the law of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales. A person who is not a party has no right under the Contracts (Rights of Third Parties) Act 1999 to enforce any term. Nothing in this Agreement limits or excludes liability for death or personal injury caused by negligence.",
  },
  {
    number: "9",
    title: "Notices",
    body: "Notices shall be in writing and delivered by hand or by first-class post to the addresses on the signature page.",
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
    body: "The Receiving Party shall use reasonable endeavours to keep Confidential Information confidential and shall use it only for the Purpose. Upon request, the Receiving Party shall return or destroy all Confidential Information.",
  },
  {
    number: "4",
    title: "Notices",
    body: "Notices shall be in writing and may be sent by email alone to the addresses on the signature page.",
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
    body: "This Agreement is governed by the law of New York. The parties submit to the non-exclusive jurisdiction of the courts of New York. The Receiving Party may exclude liability for death or personal injury caused by negligence.",
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
    body: "Northline Software Ltd will provide the hosted workspace described in this Order Form to the Customer.",
  },
  {
    number: "2",
    title: "Fees",
    body: "The Customer shall pay £18,000 per year, plus VAT, due 30 days from the invoice date.",
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
    body: "This Order is governed by the law of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales.",
  },
];

const saasRevised: DraftClause[] = [
  saasOriginal[0],
  {
    number: "2",
    title: "Fees",
    body: "The Customer shall pay £24,000 per year, plus VAT, due 30 days from the invoice date.",
  },
  {
    number: "3",
    title: "Term",
    body: "The initial term is twelve (12) months and shall automatically renew for successive twelve (12) month terms unless Customer gives written notice of non-renewal.",
  },
  {
    number: "4",
    title: "Limitation of Liability",
    body: "The Customer's liability shall be unlimited. The Supplier's aggregate liability is capped at the fees paid under this Order in the prior twelve (12) months.",
  },
  {
    number: "5",
    title: "Assignment",
    body: "The Supplier may assign this Order without the consent of the Customer.",
  },
  {
    number: "6",
    title: "Governing Law",
    body: "This Order is governed by the law of New York. The parties submit to the non-exclusive jurisdiction of the courts of New York. Notices under Section 7 shall be sent to the Supplier's current address.",
  },
];

const contractorOriginal: DraftClause[] = [
  {
    number: "1",
    title: "Services",
    body: "The Contractor will prepare the drawings described in the statement of work.",
  },
  {
    number: "2",
    title: "Payment",
    body: "The Client shall pay a fixed fee of £8,500, plus VAT, half on signature and half on delivery.",
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
    body: "Each party's aggregate liability is capped at the fees paid under this Agreement. A claim must be brought within six (6) years of the cause of action accruing.",
  },
  {
    number: "6",
    title: "Governing Law",
    body: "This Agreement is governed by the law of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales.",
  },
];

const contractorRevised: DraftClause[] = [
  contractorOriginal[0],
  {
    number: "2",
    title: "Payment",
    body: "The Client shall pay a fixed fee of £11,000, plus VAT, half on signature and half on delivery.",
  },
  {
    number: "3",
    title: "Term",
    body: "This Agreement ends one (1) month after the Effective Date and shall automatically renew for successive one (1) month terms until Client gives notice.",
  },
  {
    number: "4",
    title: "Intellectual Property",
    body: "The Contractor owns the deliverables and grants the Client a non-exclusive licence to use them for the project named in the statement of work.",
  },
  {
    number: "5",
    title: "Non-Solicit",
    body: "The Client shall not solicit the Contractor's employees during the term and for one (1) year after it ends.",
  },
  {
    number: "6",
    title: "Limitation of Liability",
    body: "Each party's aggregate liability is capped at the fees paid under this Agreement. A claim must be brought within twelve (12) months of the cause of action accruing.",
  },
  {
    number: "7",
    title: "Governing Law",
    body: "This Agreement is governed by Scots law. The parties submit to the non-exclusive jurisdiction of the courts of Scotland.",
  },
  {
    number: "8",
    title: "Assignment",
    body: "The Contractor may assign this Agreement without the consent of the Client.",
  },
];

export const SAMPLES: SamplePair[] = [
  {
    id: "nda",
    name: "Mutual NDA",
    blurb: "Notices move from clause 9 to clause 4. A sentence moves with them. Section 9 in the boilerplate is then wrong.",
    original: ndaOriginal,
    revised: ndaRevised,
  },
  {
    id: "saas",
    name: "SaaS order form",
    blurb: "The order starts to renew, the liability cap is cut, and the courts move off England and Wales.",
    original: saasOriginal,
    revised: saasRevised,
  },
  {
    id: "contractor",
    name: "Contractor agreement",
    blurb: "The claim period drops from six years to twelve months, and the governing law moves to Scotland.",
    original: contractorOriginal,
    revised: contractorRevised,
  },
];
