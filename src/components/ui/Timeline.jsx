import React from 'react';
import ScrollTimeline from './ScrollTimeline';

const fullMilestones = [
  {
    id: '1918',
    date: '18 September 1918',
    title: 'Founding of Henarathgoda Seewali Buddhist School',
    description:
      'Established as "Henarathgoda Seewali Buddhist School" at the present location of Yashodara Devi Balika Vidyalaya. Mr. Charles Samarasooriya served as the first Principal.',
  },
  {
    id: '1923-1926',
    date: '1923 – 1926',
    title: 'Academic Success & Library Inauguration',
    points: [
      '1923: Achieved 75% examination pass rate at the J.S.C. Examination; Junior Cadet Troop inaugurated (Feb 13, 1923).',
      '1924: Inauguration of the primary school library; achieved 86% pass rate at the J.S.C. Examination.',
      '1925–1926: Mr. W.P. Samarasooriya appointed Principal; new dedicated library building completed and opened in June 1926.',
    ],
  },
  {
    id: '1936',
    date: '1936',
    title: 'Electrification & Extra-Curricular Expansion',
    points: [
      'Electricity facility launched on campus.',
      'After 18 years, the school expanded into Sinhala and English Literature Associations, Athletics, Cadet Platoon, Rifle Association, Debating, Drama, News Unit, and Environment Club.',
      'Students actively cultivated the full six-and-a-half-acre school property.',
    ],
  },
  {
    id: '1948-1949',
    date: '1948 – 1949',
    title: 'Relocation to Present Campus',
    points: [
      '1948: Student body grew to 592 students with 20 teachers under Principal Mr. M.A.R. Cooray.',
      '1949: Relocated to its present site under the name "Henarathgoda Senior Secondary English School".',
    ],
  },
  {
    id: '1958',
    date: '1958',
    title: 'Opening of the Main Hall',
    description:
      'The landmark Main Hall was officially opened by the Honorable Prime Minister, Mr. S.W.R.D. Bandaranayake.',
  },
  {
    id: '1963-1968',
    date: '1963 – 1968',
    title: 'School Band & University Admissions Breakthrough',
    points: [
      '1963: School Band formed under guidance of music teacher Mr. D. Thirimanna.',
      '1965: 21 out of 37 G.C.E. A/L candidates qualified for Sri Lankan Universities.',
      '1968: Principal Mr. G. Munasinghe appointed to "Siyawasa Service"; succeeded by Mr. S.W. Subasinghe.',
    ],
  },
  {
    id: '1971-1976',
    date: '1971 – 1976',
    title: 'BBC Television Broadcast & National Championships',
    points: [
      '1971–1972: Library upgraded with complete facilities; Mr. D.N. Rajapakshe appointed Principal.',
      '1973: Won All Island Senior Volleyball Trophy; BBC televised "Teaching of English" class, school dance troupe (Mr. Wimal Wayanarda), and band (Mr. Thirimanna); Cadet Troop registered.',
      '1975–1976: Won All Island Volleyball Trophy; Minister of Sports commended school band as best overall performance.',
    ],
  },
  {
    id: '1978-1983',
    date: '1978 – 1983',
    title: 'Shrine Room Gift & Campus Expansion',
    points: [
      '1978: Mr. D.P. Jayasinghe gifted the Shrine Room; Mr. Dharma Sri Gunapala became Principal.',
      '1980: Principals Mr. Edward Jayanetti and Mr. A.J. Kolitha Jayasundara served leadership terms.',
      '1983: Mr. Premasena Udugampola appointed Principal with 2,068 students, 78 staff, and 57 classrooms; junior library opened.',
    ],
  },
  {
    id: '1985-1986',
    date: '1985 – 1986',
    title: 'District Scouting Leadership & Playground Land Purchase',
    points: [
      '1985: All-Island Athletic medals, Senior Cadet priority certificates, All-Island Badminton Trophy, Saukyadana Traffic/First-Aid units, 1st place in "Buddhi Pradeepa", largest Scout group in Gampaha District.',
      '1986: School band performed at National Day; H.R.N. Amarasinghe won silver in All-Island Athletics; purchased 42 perches land for playground from Gampaha Municipal Council.',
    ],
  },
  {
    id: '1988-1993',
    date: '1988 – 1993',
    title: 'National School Elevation & 75th Jubilee Exhibition',
    points: [
      '1988–1992: Leadership under Mr. P.G.D.T. Aquinas (1988), Mr. S. Mallawarachchi (1991), and Mr. R.M. Sumanapala (1992); two scouts earned "Wood Badge".',
      '1993: Promoted as a National School as Bandaranayake College; 75th Anniversary celebrated with first-ever student-run FM radio channel; 1st place in All-Island Arts Competition.',
    ],
  },
  {
    id: '1994-1997',
    date: '1994 – 1997',
    title: 'Pakistan World Jamboree & Computer Facility Launch',
    points: [
      '1994: 4 President Scouts & Master Mr. Daya Ranjith attended Pakistan Jamboree; published "Shilpa Denu Mai".',
      '1995: Computer Unit & Dental Clinic introduced; Colors Night hosted with President Chandrika Bandaranaike and Education Minister Richard Pathirana.',
      '1996–1997: Science Library opened; 1st place in "Sithivili Sri Lanka" and All-Island Art; "Ape Lokaya" exhibition held at Kala Bhavana with PM Sirimavo Bandaranaike; Sanjaya Mendis won Gold in All-Island Art (1997).',
    ],
  },
  {
    id: '1999-2000',
    date: '1999 – 2000',
    title: '80th Anniversary "X-Ban \'99" & School Bus Purchase',
    points: [
      '1999: "X-Ban \'99" Educational Exhibition & Carnival held for 80th Anniversary; proceeds enabled Old Boys’ Association (OBA) to purchase a dedicated school bus and open a new OBA office.',
      '2000: Math section student Mirihagalla secured All-Island 3rd Place.',
    ],
  },
  {
    id: '2001-2002',
    date: '2001 – 2002',
    title: 'English Medium Classes, BOC Branch & Rugby Division A',
    points: [
      '2001: Mr. M.J.M.H.W. Ranjith appointed Principal, elevating standards across academic and co-curricular spheres.',
      '2002: Mr. W.M. Jayantha Wickramanayake appointed Principal; launched English Medium classes, renovated playground with perimeter fence, installed new OBA computer lab, Rugby team qualified to A Division, 11 Hockey players toured Malaysia ("PINAC PESTA"), Eastern Band runners-up at Rantambe, and Bank of Ceylon "RanKekulu" branch inaugurated on campus.',
    ],
  },
  {
    id: '2004-2005',
    date: '2004 – 2005',
    title: 'All-Island Music Champions & Herman Loos Honors',
    points: [
      '2004: Mr. Priyantha Srilal Nonis appointed Principal; Annual Prize Giving hosted with Minister Dinesh Gunawardana.',
      '2005: 87th Anniversary celebrations with blood donation drive; "Wes Thabeeme Mangalya" for 16 traditional dancers; Eastern Band (1st) and Western Band (4th) in All-Island Band Competition; Cadet Platoon placed 4th in Herman Loos Trophy.',
    ],
  },
  {
    id: '2006-2007',
    date: '2006 – 2007',
    title: 'Modern Infrastructure Era & Sports Complex Development',
    points: [
      '2006: Prefect Board and Buddhist Society organized armed forces support campaigns; Rev. Labuthale Sudassana Thero appointed Principal.',
      '2007: Annual Prize Giving & Colors Night hosted with Minister Pandu Bandaranaike and National School Director Mr. Srilal Nonis.',
    ],
  },
];

export default function Timeline() {
  return (
    <section className="timeline-section py-12" aria-labelledby="timeline-title">
      <div className="life-detail-section-heading text-center max-w-3xl mx-auto mb-8">
        <p className="life-detail-kicker">HERITAGE & MILESTONES</p>
        <h2 id="timeline-title" className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a]">
          Historical Timeline
        </h2>
        <p className="life-detail-description text-neutral-600 mt-2">
          A century-long chronicle of leadership, resilience, and academic distinction at Bandaranayake College Gampaha.
        </p>
      </div>

      <ScrollTimeline milestones={fullMilestones} />
    </section>
  );
}