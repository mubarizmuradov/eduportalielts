/* eslint-disable */
/**
 * A complete IELTS General Training mock test in the package format 1.1
 * (docs/IELTS_PACKAGE_FORMAT.md). It shows what 1.1 added:
 *   - map with letterPositions (letters drawn by the exam), plan labelling
 *     with a box of answers, a question with a picture (bags A–C),
 *   - "Which TWO …?" short answer with answerUnits (any order),
 *   - "ONE WORD OR A NUMBER" (numberRule "or"), a flow-chart that branches
 *     and loops (flow: nodes + edges),
 *   - General Training reading: labelled short texts A–D with
 *     matching information over texts, a glossary,
 *   - explanations, examiner notes, a GT letter and an "outweigh" essay.
 * Media are placeholders (samples/media.js).
 *
 *   node samples/general-sample-package.js > /tmp/general-sample.json
 */
const { toneWav, centreMap, floorPlan, threeBags } = require('./media');

const SECONDS = 20; // placeholder recordings; real parts last 6-8 minutes

function makeGeneralSamplePackage() {
  return {
    schemaVersion: '1.1',
    testType: 'general_training',
    title: 'General Training Mock Test 1 (sample)',
    meta: { source: 'hand-written sample', targetBand: '6.0' },
    assets: [
      ...[1, 2, 3, 4].map((n) => ({
        id: `gt-listening-${n}`,
        kind: 'audio',
        mimeType: 'audio/wav',
        data: toneWav(SECONDS, 300 + n * 100),
        durationSeconds: SECONDS,
      })),
      { id: 'centre-map', kind: 'image', mimeType: 'image/svg+xml', data: centreMap(), alt: 'Map of a community centre with eight rooms' },
      { id: 'floor-plan', kind: 'image', mimeType: 'image/svg+xml', data: floorPlan(), alt: 'Plan of the first floor with four unnamed rooms' },
      { id: 'bags', kind: 'image', mimeType: 'image/svg+xml', data: threeBags(), alt: 'Three bags labelled A, B and C' },
    ],

    // =========================================================== LISTENING
    listening: {
      parts: [
        {
          partNumber: 1,
          context: 'A woman phoning a sports club to become a member.',
          audio: 'gt-listening-1',
          transcript:
            'RECEPTIONIST: Greenfield Sports Club, good morning. WOMAN: Hi, I’d like to join. My name is Sarah Kowalski, that’s K-O-W-A-L-S-K-I … RECEPTIONIST: Your membership number will be 4512 … Which day suits you best? WOMAN: Thursday, I think … RECEPTIONIST: It’s 35 pounds a month … How did you hear about us? WOMAN: I saw an advert in the newspaper … RECEPTIONIST: Please park at the north entrance … What would you like to try? WOMAN: Swimming, and maybe tennis. Not squash, my knee … RECEPTIONIST: Bring a bag with a separate pocket for wet things – the square one with the small front pocket is perfect … The first session is free …',
          questionGroups: [
            {
              type: 'completion',
              variant: 'form',
              title: 'Greenfield Sports Club – new member',
              wordLimit: { maxWords: 1, allowNumber: true, numberRule: 'or' },
              lines: [
                { text: 'Surname: {{1}}' },
                { text: 'Membership number: {{2}}' },
                { text: 'Preferred day: {{3}}' },
                { text: 'Fee: £{{4}} per month' },
                { text: 'Heard about the club in a {{5}}' },
                { text: 'Parking: use the {{6}} entrance' },
              ],
              gaps: [
                { number: 1, answers: ['Kowalski'], explanation: 'She spells it: K-O-W-A-L-S-K-I.' },
                { number: 2, answers: ['4512'] },
                { number: 3, answers: ['Thursday'] },
                { number: 4, answers: ['35', 'thirty-five'] },
                { number: 5, answers: ['newspaper'] },
                { number: 6, answers: ['north'] },
              ],
            },
            {
              type: 'short_answer',
              wordLimit: { maxWords: 1, allowNumber: false },
              questions: [
                {
                  numbers: [7, 8],
                  question: 'Which TWO activities does Sarah want to try?',
                  answerUnits: [['swimming'], ['tennis']],
                  explanation: '“Swimming, and maybe tennis. Not squash.”',
                },
              ],
            },
            {
              type: 'multiple_choice',
              questions: [
                {
                  number: 9,
                  stem: 'Which bag does the receptionist recommend?',
                  image: 'bags',
                  options: [
                    { key: 'A', text: 'bag A' },
                    { key: 'B', text: 'bag B' },
                    { key: 'C', text: 'bag C' },
                  ],
                  answer: 'B',
                  explanation: '“the square one with the small front pocket”',
                },
                {
                  number: 10,
                  stem: 'The first session',
                  options: [
                    { key: 'A', text: 'is free.' },
                    { key: 'B', text: 'costs half price.' },
                    { key: 'C', text: 'must be booked online.' },
                  ],
                  answer: 'A',
                },
              ],
            },
          ],
        },
        {
          partNumber: 2,
          context: 'A manager showing new volunteers around a community centre.',
          audio: 'gt-listening-2',
          transcript:
            'Welcome, everyone … As you come in through the main entrance, the café is the room straight ahead on the right … the library is in the top left corner … the computer room is next to the lift at the top … the hall is the big room on the bottom left … the children’s room is beside the café … Upstairs, the first room after the stairs is the office, then the storeroom at the end; below the stairs is the quiet room … Volunteers who help in the café should talk to Maria; anyone helping with the children talks to Ben …',
          questionGroups: [
            {
              type: 'map_labelling',
              visualKind: 'map',
              title: 'Riverside Community Centre – ground floor',
              image: 'centre-map',
              letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
              letterPositions: [
                { key: 'A', x: 18.3, y: 28.75 },
                { key: 'B', x: 43.3, y: 28.75 },
                { key: 'C', x: 65.8, y: 28.75 },
                { key: 'D', x: 85.8, y: 28.75 },
                { key: 'E', x: 18.3, y: 71.25 },
                { key: 'F', x: 43.3, y: 71.25 },
                { key: 'G', x: 65.8, y: 71.25 },
                { key: 'H', x: 85.8, y: 71.25 },
              ],
              questions: [
                { number: 11, label: 'Café', answer: 'G' },
                { number: 12, label: 'Library', answer: 'A' },
                { number: 13, label: 'Computer room', answer: 'D' },
                { number: 14, label: 'Hall', answer: 'E' },
                { number: 15, label: "Children's room", answer: 'H' },
              ],
            },
            {
              type: 'diagram_label_completion',
              visualKind: 'plan',
              title: 'First floor',
              image: 'floor-plan',
              answerMode: 'select',
              options: [
                { key: 'A', text: 'office' },
                { key: 'B', text: 'storeroom' },
                { key: 'C', text: 'quiet room' },
                { key: 'D', text: 'kitchen' },
                { key: 'E', text: 'first-aid room' },
              ],
              labels: [
                { number: 16, x: 50, y: 31, answer: 'A' },
                { number: 17, x: 81, y: 31, answer: 'B' },
                { number: 18, x: 26, y: 75, answer: 'C' },
              ],
            },
            {
              type: 'matching_features',
              title: 'Who should these volunteers talk to?',
              optionsTitle: 'People',
              options: [
                { key: 'A', text: 'Maria' },
                { key: 'B', text: 'Ben' },
                { key: 'C', text: 'the manager' },
              ],
              allowReuse: true,
              questions: [
                { number: 19, statement: 'volunteers helping in the café', answer: 'A' },
                { number: 20, statement: 'volunteers helping with children', answer: 'B' },
              ],
            },
          ],
        },
        {
          partNumber: 3,
          context: 'Two students planning a water-quality experiment with their tutor.',
          audio: 'gt-listening-3',
          transcript:
            'TUTOR: So how will you start? JAMES: First we choose a river site … then we test the water samples. If the results are clear, we write the report. If not, we repeat the test with a larger sample … Finally we present at the student conference … LUCY: The two problems last time were bad weather and broken equipment …',
          questionGroups: [
            {
              type: 'completion',
              variant: 'flow_chart',
              title: 'Plan for the experiment',
              wordLimit: { maxWords: 2, allowNumber: false },
              flow: {
                nodes: [
                  { id: 'site', text: 'Choose a river {{21}}' },
                  { id: 'test', text: 'Test the water samples' },
                  { id: 'clear', text: 'Results clear: write the {{22}}' },
                  { id: 'repeat', text: 'Results unclear: repeat with a larger {{23}}' },
                  { id: 'present', text: 'Present findings at the student {{24}}' },
                ],
                edges: [
                  { from: 'site', to: 'test' },
                  { from: 'test', to: 'clear' },
                  { from: 'test', to: 'repeat' },
                  { from: 'repeat', to: 'test' },
                  { from: 'clear', to: 'present' },
                ],
              },
              gaps: [
                { number: 21, answers: ['site'] },
                { number: 22, answers: ['report'] },
                { number: 23, answers: ['sample'] },
                { number: 24, answers: ['conference'] },
              ],
            },
            {
              type: 'multiple_choice_multi',
              items: [
                {
                  numbers: [25, 26],
                  stem: 'Which TWO problems did the students have last time?',
                  options: [
                    { key: 'A', text: 'bad weather' },
                    { key: 'B', text: 'a lack of time' },
                    { key: 'C', text: 'broken equipment' },
                    { key: 'D', text: 'too few volunteers' },
                    { key: 'E', text: 'getting permission' },
                  ],
                  answers: ['A', 'C'],
                },
              ],
            },
            {
              type: 'completion',
              variant: 'summary',
              answerMode: 'select',
              title: 'The tutor’s advice',
              options: [
                { key: 'A', text: 'labels' },
                { key: 'B', text: 'photographs' },
                { key: 'C', text: 'gloves' },
                { key: 'D', text: 'budget' },
                { key: 'E', text: 'timetable' },
                { key: 'F', text: 'map' },
              ],
              lines: [
                {
                  text: 'The tutor tells the students to wear {{27}} at the river and to put {{28}} on every bottle. They should take {{29}} of each site and agree a {{30}} before they start.',
                },
              ],
              gaps: [
                { number: 27, answer: 'C' },
                { number: 28, answer: 'A' },
                { number: 29, answer: 'B' },
                { number: 30, answer: 'E' },
              ],
            },
          ],
        },
        {
          partNumber: 4,
          context: 'A talk about the history of the bicycle.',
          audio: 'gt-listening-4',
          transcript:
            'The first bicycle, in 1817, had no pedals – riders pushed with their feet … It was made of wood … Pedals came in the 1860s … The high-wheeler was popular with young men but was dangerous … The safety bicycle of 1885 had a chain … Air-filled tyres arrived in 1888 … Today in the Netherlands there are more bicycles than people …',
          questionGroups: [
            {
              type: 'completion',
              variant: 'note',
              title: 'The history of the bicycle',
              wordLimit: { maxWords: 1, allowNumber: false },
              lines: [
                { text: 'Early machines', style: 'heading' },
                { text: '1817: riders pushed with their {{31}}', style: 'bullet' },
                { text: 'the frame was made of {{32}}', style: 'bullet' },
                { text: '1860s: {{33}} were added', style: 'bullet' },
                { text: 'The high-wheeler', style: 'heading' },
                { text: 'popular with young men but {{34}}', style: 'bullet' },
                { text: 'The safety bicycle', style: 'heading' },
                { text: 'used a {{35}} to drive the back wheel', style: 'bullet' },
                { text: 'air-filled {{36}} made riding comfortable', style: 'bullet' },
              ],
              gaps: [
                { number: 31, answers: ['feet'] },
                { number: 32, answers: ['wood'] },
                { number: 33, answers: ['pedals'] },
                { number: 34, answers: ['dangerous'] },
                { number: 35, answers: ['chain'] },
                { number: 36, answers: ['tyres', 'tires'] },
              ],
            },
            {
              type: 'completion',
              variant: 'table',
              wordLimit: { maxWords: 2, allowNumber: true },
              table: {
                columns: ['Country', 'Fact'],
                rows: [
                  ['the Netherlands', 'more bicycles than {{37}}'],
                  ['Denmark', 'about {{38}} % of people cycle to work'],
                  ['Japan', 'many stations have large {{39}}'],
                  ['the UK', 'cycling grew after the {{40}}'],
                ],
              },
              gaps: [
                { number: 37, answers: ['people'] },
                { number: 38, answers: ['40', 'forty'] },
                { number: 39, answers: ['bicycle parks', '(bike) parks', 'bike parks'] },
                { number: 40, answers: ['(2012) Olympics', 'Olympic Games'] },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================== READING (General Training)
    reading: {
      sections: [
        {
          sectionNumber: 1,
          texts: [
            {
              label: 'A',
              title: 'Westside Language School',
              paragraphs: [
                { text: 'Evening classes in Spanish and Italian, Monday to Thursday. Small groups of no more than eight students. All teachers are native speakers. Free parking behind the building.' },
              ],
            },
            {
              label: 'B',
              title: 'City College – Languages for Work',
              paragraphs: [
                { text: 'Business French and German at weekends. Your employer may pay the fee – ask at reception for a form. Certificates are recognised by over 200 companies.' },
              ],
            },
            {
              label: 'C',
              title: 'Talk Together Online',
              paragraphs: [
                { text: 'Learn any of 12 languages from home with live video lessons. Choose your own times, day or night. The first lesson is free and there is no contract.' },
              ],
            },
            {
              label: 'D',
              title: 'Harbour Community Centre',
              paragraphs: [
                { text: 'Beginners’ Japanese on Saturday mornings, held in the library room. Lessons are free for people over 65. Bring your own dictionary.' },
              ],
            },
          ],
          questionGroups: [
            {
              type: 'matching_information',
              scope: 'texts',
              allowReuse: true,
              questions: [
                { number: 1, statement: 'lessons at any time of the day', answer: 'C', explanation: '“Choose your own times, day or night.”' },
                { number: 2, statement: 'a course your company might pay for', answer: 'B' },
                { number: 3, statement: 'no charge for older people', answer: 'D' },
                { number: 4, statement: 'a limit on class size', answer: 'A' },
                { number: 5, statement: 'a qualification known to employers', answer: 'B' },
                { number: 6, statement: 'a trial lesson that costs nothing', answer: 'C' },
                { number: 7, statement: 'something students must bring', answer: 'D' },
              ],
            },
            {
              type: 'true_false_not_given',
              questions: [
                { number: 8, statement: 'Westside Language School has classes every weekday evening.', answer: 'FALSE', explanation: 'Monday to Thursday only.' },
                { number: 9, statement: 'Parking at Westside Language School is free.', answer: 'TRUE' },
                { number: 10, statement: 'City College teaches Spanish.', answer: 'NOT_GIVEN' },
                { number: 11, statement: 'Talk Together Online asks students to sign a contract.', answer: 'FALSE' },
                { number: 12, statement: 'Talk Together Online teaches twelve languages.', answer: 'TRUE' },
                { number: 13, statement: 'The Japanese class at Harbour Community Centre is for beginners.', answer: 'TRUE' },
                { number: 14, statement: 'Harbour Community Centre sells dictionaries.', answer: 'NOT_GIVEN' },
              ],
            },
          ],
        },
        {
          sectionNumber: 2,
          texts: [
            {
              title: 'Health and safety at Greenway Warehouse',
              paragraphs: [
                { text: 'All new staff must complete a safety induction on their first day. Your supervisor will show you the fire exits and the assembly point, which is in the north car park.' },
                { text: 'High-visibility jackets must be worn in all loading areas. Safety boots are provided free of charge; replacement boots are available from the stores office.' },
                { text: 'Any accident, however small, must be recorded in the accident book kept at the security desk. Report damaged equipment to your team leader before the end of your shift.' },
              ],
            },
            {
              title: 'Applying for staff training',
              paragraphs: [
                { text: 'Greenway offers paid training to all employees who have completed their probation period of three months. Courses range from forklift driving to first aid.' },
                { text: 'To apply, complete the online form and ask your line manager to approve it. Applications close on the last Friday of each month. Places are limited, so priority is given to staff whose role requires the qualification.' },
                { text: 'After the course, you will be asked to give feedback in a short survey. Certificates are sent to the human resources department, which keeps them on file.' },
              ],
            },
          ],
          questionGroups: [
            {
              type: 'sentence_completion',
              wordLimit: { maxWords: 2, allowNumber: false },
              questions: [
                { number: 15, sentence: 'New staff do a safety induction on their {{15}}.', answers: ['first day'] },
                { number: 16, sentence: 'The assembly point is in the north {{16}}.', answers: ['car park'] },
                { number: 17, sentence: 'Staff in loading areas must wear {{17}}.', answers: ['(high-visibility) jackets'] },
                { number: 18, sentence: 'Staff can get new boots from the {{18}}.', answers: ['stores office'] },
                { number: 19, sentence: 'The accident book is at the {{19}}.', answers: ['security desk'] },
                { number: 20, sentence: 'Damaged equipment is reported to the {{20}}.', answers: ['team leader'] },
                { number: 21, sentence: 'It must be reported before the end of the {{21}}.', answers: ['shift'] },
              ],
            },
            {
              type: 'completion',
              variant: 'note',
              title: 'Staff training',
              wordLimit: { maxWords: 2, allowNumber: true },
              lines: [
                { text: 'open to staff after a probation period of {{22}}', style: 'bullet' },
                { text: 'courses include forklift driving and {{23}}', style: 'bullet' },
                { text: 'application form must be approved by your {{24}}', style: 'bullet' },
                { text: 'deadline: last {{25}} of the month', style: 'bullet' },
                { text: 'after the course: complete a {{26}}', style: 'bullet' },
                { text: 'certificates kept by {{27}}', style: 'bullet' },
              ],
              gaps: [
                { number: 22, answers: ['three months', '3 months'] },
                { number: 23, answers: ['first aid'] },
                { number: 24, answers: ['line manager'] },
                { number: 25, answers: ['Friday'] },
                { number: 26, answers: ['(short) survey'] },
                { number: 27, answers: ['human resources', 'HR'] },
              ],
            },
          ],
        },
        {
          sectionNumber: 3,
          texts: [
            {
              title: 'The return of the urban tram',
              subtitle: 'Why cities that once removed their trams are building them again',
              paragraphs: [
                { label: 'A', text: 'In the first half of the twentieth century, most large European and American cities had tram networks. By the 1960s, many had torn up the rails, convinced that buses and private cars were the transport of the future. Buses could change routes cheaply, and cars promised freedom.' },
                { label: 'B', text: 'The cost of that decision became clear within a generation. Traffic jams grew longer, air quality fell and town centres emptied as shoppers drove to out-of-town malls. Planners began to look again at the transport they had abandoned.' },
                { label: 'C', text: 'Modern trams are very different from their ancestors. Low floors let passengers with wheelchairs or pushchairs board without steps, and electric motors make them almost silent. Some can even run short distances on batteries, so overhead wires* are not needed in historic squares.' },
                { label: 'D', text: 'Building a tram line is expensive, and critics argue that the same money would buy many more buses. Supporters reply that a tram carries up to three times as many passengers as a bus and lasts thirty years or more. Rails also send a message: unlike a bus route, a tram line is permanent, which encourages businesses to invest nearby.' },
                { label: 'E', text: 'This effect on investment may be the strongest argument. In several French cities, property values along new tram routes rose sharply within five years, and empty shops in the centre reopened. Local governments have used part of this extra tax income to repay the cost of construction.' },
                { label: 'F', text: 'Not every scheme has succeeded. Where trams share narrow streets with cars, they are often delayed, and passengers soon return to driving. Experience suggests that trams work best when they have their own lanes and priority at traffic lights.' },
              ],
              glossary: [{ term: 'overhead wires', definition: 'cables above the track that supply electricity to the tram' }],
            },
          ],
          questionGroups: [
            {
              type: 'matching_headings',
              headings: [
                { key: 'i', text: 'A permanent signal to investors' },
                { key: 'ii', text: 'Why trams disappeared' },
                { key: 'iii', text: 'The price of losing the trams' },
                { key: 'iv', text: 'Conditions for success' },
                { key: 'v', text: 'A wave of new tram museums' },
                { key: 'vi', text: 'Technology that changed the tram' },
                { key: 'vii', text: 'Paying for the line with rising values' },
                { key: 'viii', text: 'Why passengers prefer buses' },
              ],
              questions: [
                { number: 28, paragraph: 'A', answer: 'ii' },
                { number: 29, paragraph: 'B', answer: 'iii' },
                { number: 30, paragraph: 'C', answer: 'vi' },
                { number: 31, paragraph: 'D', answer: 'i' },
                { number: 32, paragraph: 'E', answer: 'vii' },
                { number: 33, paragraph: 'F', answer: 'iv' },
              ],
            },
            {
              type: 'completion',
              variant: 'summary',
              answerMode: 'select',
              title: 'Modern trams',
              options: [
                { key: 'A', text: 'batteries' },
                { key: 'B', text: 'steps' },
                { key: 'C', text: 'noise' },
                { key: 'D', text: 'drivers' },
                { key: 'E', text: 'buses' },
                { key: 'F', text: 'lanes' },
                { key: 'G', text: 'tickets' },
              ],
              lines: [
                {
                  text: 'Modern trams have low floors, so there are no {{34}} for passengers to climb, and they make very little {{35}}. Some use {{36}} to cross historic squares. They work best with their own {{37}}.',
                },
              ],
              gaps: [
                { number: 34, answer: 'B' },
                { number: 35, answer: 'C' },
                { number: 36, answer: 'A' },
                { number: 37, answer: 'F' },
              ],
            },
            {
              type: 'multiple_choice',
              questions: [
                {
                  number: 38,
                  stem: 'According to supporters, one advantage of trams over buses is that trams',
                  options: [
                    { key: 'A', text: 'are cheaper to build.' },
                    { key: 'B', text: 'can change routes easily.' },
                    { key: 'C', text: 'carry more passengers.' },
                    { key: 'D', text: 'need fewer staff.' },
                  ],
                  answer: 'C',
                },
                {
                  number: 39,
                  stem: 'What happened in several French cities?',
                  options: [
                    { key: 'A', text: 'Property prices near tram routes went up.' },
                    { key: 'B', text: 'Tram lines were closed after five years.' },
                    { key: 'C', text: 'Shops moved out of the centre.' },
                    { key: 'D', text: 'Taxes were reduced.' },
                  ],
                  answer: 'A',
                },
                {
                  number: 40,
                  stem: 'Which is the most suitable title for the passage?',
                  options: [
                    { key: 'A', text: 'The end of the motor car' },
                    { key: 'B', text: 'How trams are built' },
                    { key: 'C', text: 'A second life for the tram' },
                    { key: 'D', text: 'Europe’s busiest bus routes' },
                  ],
                  answer: 'C',
                  explanation: 'The passage explains why cities are bringing trams back.',
                },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================== WRITING (General Training)
    writing: {
      task1: {
        kind: 'general_letter',
        letterType: 'semi_formal',
        situation: 'You have just moved into a new flat. Your neighbour often plays loud music late at night.',
        bulletPoints: ['introduce yourself', 'explain the problem', 'suggest a solution'],
        salutation: 'Dear …,',
        examinerNotes: 'Semi-formal tone to a neighbour the writer has not met. All three points must be covered; a polite, specific suggestion scores better than a demand.',
      },
      task2: {
        essayType: 'outweigh',
        prompt: 'More and more people are choosing to work from home instead of travelling to an office.',
        question: 'Do the advantages of this development outweigh the disadvantages?',
        examinerNotes: 'The candidate must say which side outweighs, not only list advantages and disadvantages.',
      },
    },

    // =========================================================== SPEAKING
    speaking: {
      part1: {
        topics: [
          {
            topic: 'Work or study',
            questions: [
              { text: 'Do you work or are you a student?' },
              { text: 'What do you like most about your job or your studies?' },
              { text: 'Would you like to change anything about it?' },
            ],
          },
          {
            topic: 'Neighbours',
            questions: [
              { text: 'How well do you know your neighbours?' },
              { text: 'Do neighbours in your country help each other?' },
              { text: 'Have you ever had a problem with a neighbour?' },
            ],
          },
          {
            topic: 'Transport',
            questions: [{ text: 'How do you usually travel to work or school?' }, { text: 'Is public transport good where you live?' }],
          },
        ],
      },
      part2: {
        topic: 'Describe a journey you remember well.',
        bulletPoints: ['where you went', 'how you travelled', 'who you were with'],
        finalPrompt: 'and explain why you remember this journey.',
        roundingOff: [{ text: 'Do you enjoy long journeys?' }],
      },
      part3: {
        themes: [
          {
            theme: 'Travel and transport',
            questions: [
              { text: 'Why do some people prefer to travel by car rather than by public transport?' },
              { text: 'What could cities do to reduce traffic?' },
              { text: 'Will people travel more or less in the future? Why?' },
            ],
          },
        ],
      },
      examinerNotes: 'Part 3: if the answers are short, ask "Why?" or "Can you give an example?".',
    },
  };
}

module.exports = { makeGeneralSamplePackage };
if (require.main === module) process.stdout.write(JSON.stringify(makeGeneralSamplePackage(), null, 2));
