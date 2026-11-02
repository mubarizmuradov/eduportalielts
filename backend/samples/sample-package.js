/* eslint-disable */
/**
 * A complete IELTS Academic mock test in the package format
 * (docs/IELTS_PACKAGE_FORMAT.md). Every question type appears at least once.
 * Used by the unit / e2e tests and by `npm run sample` to write a JSON file
 * for trying the import screen. Media are placeholders (samples/media.js).
 *
 *   node samples/sample-package.js > /tmp/academic-sample.json
 */
const { toneWav, parkMap, furnaceDiagram, barChart } = require('./media');

const SECONDS = 20; // placeholder recordings; real parts last 6-8 minutes

function makeSamplePackage() {
  return {
    schemaVersion: '1.0',
    testType: 'academic',
    title: 'Academic Mock Test 1 (sample)',
    meta: { source: 'hand-written sample', targetBand: '6.5' },
    assets: [
      ...[1, 2, 3, 4].map((n) => ({
        id: `listening-part-${n}`,
        kind: 'audio',
        mimeType: 'audio/wav',
        data: toneWav(SECONDS, 330 + n * 110),
        durationSeconds: SECONDS,
      })),
      { id: 'park-map', kind: 'image', mimeType: 'image/svg+xml', data: parkMap(), alt: 'Plan of Hilltop Park with eight buildings labelled A to H' },
      { id: 'furnace', kind: 'image', mimeType: 'image/svg+xml', data: furnaceDiagram(), alt: 'Cross-section of a Roman glass furnace' },
      { id: 'commuter-chart', kind: 'image', mimeType: 'image/svg+xml', data: barChart(), alt: 'Bar chart of commuters by car and bicycle, 2000-2020' },
    ],

    // =========================================================== LISTENING
    listening: {
      parts: [
        {
          partNumber: 1,
          context: 'A phone call between a man and a receptionist at a sports centre.',
          audio: 'listening-part-1',
          transcript:
            'RECEPTIONIST: Good morning, Riverside Sports Centre. MAN: Hi, I would like to join the centre. RECEPTIONIST: Of course. Can I take your surname? MAN: It is Fletcher, F-L-E-T-C-H-E-R. … My address is 42 Mill Road … I am a nurse at the city hospital … I would like to start on the 3rd of May … I heard about you from a newspaper advertisement. RECEPTIONIST: The swimming pool membership is £28 a month, and it includes the sauna. Yoga classes are on Thursday evenings and the teacher is called Ms Brennan. The tennis courts cost £12 per hour and you need to book online. For the gym you need an induction, which takes 45 minutes …',
          questionGroups: [
            {
              type: 'completion',
              variant: 'form',
              title: 'Riverside Sports Centre – Membership form',
              wordLimit: { maxWords: 1, allowNumber: true },
              example: 'Type of membership: individual',
              lines: [
                { text: 'Surname: {{1}}' },
                { text: 'Address: {{2}} Mill Road' },
                { text: 'Occupation: {{3}}' },
                { text: 'Start date: {{4}} May' },
                { text: 'Heard about the centre from: a {{5}} advertisement' },
              ],
              gaps: [
                { number: 1, answers: ['Fletcher'] },
                { number: 2, answers: ['42'] },
                { number: 3, answers: ['nurse'] },
                { number: 4, answers: ['3', '3rd', 'third'] },
                { number: 5, answers: ['newspaper'] },
              ],
            },
            {
              type: 'completion',
              variant: 'table',
              title: 'Activities',
              wordLimit: { maxWords: 2, allowNumber: true },
              table: {
                columns: ['Activity', 'Details', 'Cost / Note'],
                rows: [
                  ['Swimming pool', 'includes the {{6}}', '£{{7}} a month'],
                  ['Yoga', '{{8}} evenings', 'teacher: Ms {{9}}'],
                  ['Gym', 'induction needed', 'lasts {{10}} minutes'],
                ],
              },
              gaps: [
                { number: 6, answers: ['sauna', '(the) sauna'] },
                { number: 7, answers: ['28'] },
                { number: 8, answers: ['Thursday'] },
                { number: 9, answers: ['Brennan'] },
                { number: 10, answers: ['45', 'forty-five'] },
              ],
            },
          ],
        },
        {
          partNumber: 2,
          context: 'A guide talking to visitors about a renovated city park.',
          audio: 'listening-part-2',
          transcript:
            'Welcome to Hilltop Park. The park reopened last spring after a two-year renovation paid for mainly by local businesses … The café is next to the main entrance, on the right … the playground is behind the fountain on the left … the toilets are in the corner near the car park … the gift shop is opposite the café … the art gallery is at the top right of the park … Two things visitors often ask about: dogs must be kept on a lead, and cycling is only allowed on the main paths …',
          questionGroups: [
            {
              type: 'multiple_choice',
              questions: [
                {
                  number: 11,
                  stem: 'The renovation of the park was paid for mainly by',
                  options: [
                    { key: 'A', text: 'the city council.' },
                    { key: 'B', text: 'local businesses.' },
                    { key: 'C', text: 'a national charity.' },
                  ],
                  answer: 'B',
                },
                {
                  number: 12,
                  stem: 'How long did the renovation take?',
                  options: [
                    { key: 'A', text: 'one year' },
                    { key: 'B', text: 'eighteen months' },
                    { key: 'C', text: 'two years' },
                  ],
                  answer: 'C',
                },
                {
                  number: 13,
                  stem: 'The park reopened in',
                  options: [
                    { key: 'A', text: 'spring.' },
                    { key: 'B', text: 'summer.' },
                    { key: 'C', text: 'autumn.' },
                  ],
                  answer: 'A',
                },
              ],
            },
            {
              type: 'map_labelling',
              title: 'Plan of Hilltop Park',
              image: 'park-map',
              letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
              questions: [
                { number: 14, label: 'Café', answer: 'G' },
                { number: 15, label: 'Playground', answer: 'B' },
                { number: 16, label: 'Toilets', answer: 'E' },
                { number: 17, label: 'Gift shop', answer: 'F' },
                { number: 18, label: 'Art gallery', answer: 'D' },
              ],
            },
            {
              type: 'multiple_choice_multi',
              items: [
                {
                  numbers: [19, 20],
                  stem: 'Which TWO rules does the guide mention?',
                  options: [
                    { key: 'A', text: 'Visitors must not feed the birds.' },
                    { key: 'B', text: 'Dogs must be kept on a lead.' },
                    { key: 'C', text: 'Barbecues are not allowed.' },
                    { key: 'D', text: 'Cycling is only allowed on the main paths.' },
                    { key: 'E', text: 'The park closes at sunset.' },
                  ],
                  answers: ['B', 'D'],
                },
              ],
            },
          ],
        },
        {
          partNumber: 3,
          context: 'Two students, Maya and Tom, discussing a research project with their tutor.',
          audio: 'listening-part-3',
          transcript:
            'TUTOR: So, your project on urban noise … MAYA: We decided to focus on traffic noise and on how it affects sleep … TOM: … Dr Lin suggested the questionnaire, Professor Adams recommended the noise meters, and the librarian helped us find the government reports … MAYA: Next we need to interview residents, then analyse the data using a spreadsheet, and finally present the results in a poster …',
          questionGroups: [
            {
              type: 'multiple_choice_multi',
              items: [
                {
                  numbers: [21, 22],
                  stem: 'Which TWO aspects of urban noise will the students focus on?',
                  options: [
                    { key: 'A', text: 'noise from building sites' },
                    { key: 'B', text: 'traffic noise' },
                    { key: 'C', text: 'noise in schools' },
                    { key: 'D', text: 'effects on sleep' },
                    { key: 'E', text: 'effects on property prices' },
                  ],
                  answers: ['B', 'D'],
                },
              ],
            },
            {
              type: 'matching_features',
              optionsTitle: 'People',
              title: 'Who gave the students each piece of help?',
              options: [
                { key: 'A', text: 'Dr Lin' },
                { key: 'B', text: 'Professor Adams' },
                { key: 'C', text: 'the librarian' },
              ],
              allowReuse: true,
              questions: [
                { number: 23, statement: 'suggested a questionnaire', answer: 'A' },
                { number: 24, statement: 'recommended noise meters', answer: 'B' },
                { number: 25, statement: 'found government reports', answer: 'C' },
                { number: 26, statement: 'warned about a small sample size', answer: 'A' },
                { number: 27, statement: 'lent them equipment', answer: 'B' },
              ],
            },
            {
              type: 'sentence_completion',
              wordLimit: { maxWords: 1, allowNumber: false },
              questions: [
                { number: 28, sentence: 'First, the students will interview {{28}}.', answers: ['residents'] },
                { number: 29, sentence: 'They will analyse the data using a {{29}}.', answers: ['spreadsheet'] },
                { number: 30, sentence: 'They will present the results in a {{30}}.', answers: ['poster'] },
              ],
            },
          ],
        },
        {
          partNumber: 4,
          context: 'A lecture about the history of chocolate.',
          audio: 'listening-part-4',
          transcript:
            'Today I want to talk about chocolate … The cacao tree grows only in hot, wet regions near the equator … the Maya drank chocolate mixed with chilli … it reached Spain in the 16th century, where sugar was added … In 1828 a Dutch chemist invented a press that separated cocoa butter … Production today: the pods are harvested, the beans are fermented for about a week, then dried in the sun, then roasted … The biggest producer today is Côte d’Ivoire … The main threat to production is disease …',
          questionGroups: [
            {
              type: 'completion',
              variant: 'note',
              title: 'The history of chocolate',
              wordLimit: { maxWords: 1, allowNumber: false },
              lines: [
                { text: 'Origins', style: 'heading' },
                { text: 'cacao trees need hot and {{31}} conditions', style: 'bullet' },
                { text: 'the Maya drank chocolate with {{32}}', style: 'bullet' },
                { text: 'In Europe', style: 'heading' },
                { text: 'Spanish added {{33}} to the drink', style: 'bullet' },
                { text: 'a {{34}} invented a press in 1828', style: 'bullet' },
                { text: 'the press removed cocoa {{35}}', style: 'indent' },
              ],
              gaps: [
                { number: 31, answers: ['wet'] },
                { number: 32, answers: ['chilli', 'chili'] },
                { number: 33, answers: ['sugar'] },
                { number: 34, answers: ['chemist'] },
                { number: 35, answers: ['butter'] },
              ],
            },
            {
              type: 'completion',
              variant: 'flow_chart',
              title: 'Modern production',
              wordLimit: { maxWords: 1, allowNumber: false },
              steps: ['pods are harvested', 'beans are {{36}} for about a week', 'beans are dried in the {{37}}', 'beans are {{38}}'],
              gaps: [
                { number: 36, answers: ['fermented'] },
                { number: 37, answers: ['sun'] },
                { number: 38, answers: ['roasted'] },
              ],
            },
            {
              type: 'short_answer',
              wordLimit: { maxWords: 2, allowNumber: false },
              questions: [
                { number: 39, question: 'Which country is the largest producer today?', answers: ["Côte d'Ivoire", 'Ivory Coast'] },
                { number: 40, question: 'What is the main threat to production?', answers: ['disease', '(plant) disease'] },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================== READING
    reading: {
      sections: [
        {
          sectionNumber: 1,
          texts: [
            {
              title: 'The History of Glass',
              paragraphs: [
                { text: 'From our earliest origins, humans have been making use of glass. Historians have discovered that a type of natural glass, obsidian, formed in places such as the mouths of volcanoes as a result of the intense heat of an eruption melting sand, was first used as tips for spears. Archaeologists have even found evidence of man-made glass which dates back to 4000 BC; this took the form of glazes used for coating stone beads. It was not until 1500 BC, however, that the first hollow glass container was made by covering a sand core with a layer of molten glass.' },
                { text: 'Glass blowing became the most common way to make glass containers from the first century BC. The glass made during this time was highly coloured due to the impurities of the raw material. In the first century AD, methods of creating colourless glass were developed, which was then tinted by the addition of colouring materials. The secret of glass making was taken across Europe by the Romans during this century. However, they guarded the skills and technology required to make glass very closely, and it was not until their empire collapsed in 476 AD that glass-making knowledge became widespread throughout Europe and the Middle East.' },
                { text: 'The Romans built their furnaces from clay. A wood-fired chamber at the bottom heated the furnace, and workers gathered molten glass through a small opening near the top. From the 10th century onwards, the Venetians gained a reputation for technical skill and artistic ability in the making of glass bottles, and many of the city’s craftsmen left Italy to set up glassworks throughout Europe.' },
                { text: 'A major milestone in the history of glass occurred with the invention of lead crystal glass by the English glass manufacturer George Ravenscroft (1632–1683). He attempted to counter the effect of clouding that sometimes occurred in blown glass by introducing lead to the raw materials used in the process. The new glass he created was softer and easier to decorate, and had a higher refractive index, adding to its brilliance and beauty, and it proved invaluable to the optical industry. It is thanks to Ravenscroft’s invention that optical lenses, astronomical telescopes, microscopes and the like became possible.' },
                { text: 'In Britain, the modern glass industry only really started to develop after the repeal of the Excise Act in 1845. Before that time, heavy taxes had been placed on the amount of glass melted in a glasshouse, and were levied continuously from 1745 to 1845. Joseph Paxton’s Crystal Palace at London’s Great Exhibition of 1851 marked the beginning of glass as a material used in the building industry. This revolutionary new building encouraged the use of glass in public, domestic and horticultural architecture. Glass manufacturing techniques also improved with the advancement of science and the development of better technology.' },
                { text: 'From 1887 onwards, glass making developed from traditional mouth-blowing to a semi-automatic process, after factory owner HM Ashley introduced a machine capable of producing 200 bottles per hour in Castleford, Yorkshire, England – more than three times quicker than any previous production method. Then in 1907, the first fully automated machine was developed in the USA by Michael Owens – founder of the Owens Bottle Machine Company (later the major manufacturers Owens-Illinois) – and installed in its factory. Owens’ invention could produce an impressive 2,500 bottles per hour. Other developments followed rapidly, but it was not until the First World War, when Britain became cut off from essential glass suppliers, that glass became part of the scientific sector.' },
                { text: 'Today, glass is produced in a range of forms, from containers to fibre optics, and it can be recycled again and again without any loss of quality. Recycling saves both raw materials and the energy needed to melt them, which is why many countries now collect used glass separately from other waste.' },
              ],
            },
          ],
          questionGroups: [
            {
              type: 'true_false_not_given',
              questions: [
                { number: 1, statement: 'The first man-made glass was used to coat stone beads.', answer: 'TRUE' },
                { number: 2, statement: 'Colourless glass was first produced in the first century BC.', answer: 'FALSE' },
                { number: 3, statement: 'The Romans shared their glass-making skills with other nations.', answer: 'FALSE' },
                { number: 4, statement: 'Venetian glass-makers were the first to make coloured bottles.', answer: 'NOT_GIVEN' },
                { number: 5, statement: 'Lead crystal glass made modern telescopes possible.', answer: 'TRUE' },
              ],
            },
            {
              type: 'completion',
              variant: 'note',
              title: 'Glass in Britain',
              wordLimit: { maxWords: 2, allowNumber: true },
              lines: [
                { text: 'taxes on melted glass were collected until {{6}}', style: 'bullet' },
                { text: 'the {{7}} of 1851 showed glass could be used for buildings', style: 'bullet' },
                { text: 'HM Ashley’s machine produced {{8}} bottles per hour', style: 'bullet' },
              ],
              gaps: [
                { number: 6, answers: ['1845'] },
                { number: 7, answers: ['Crystal Palace', 'Great Exhibition'] },
                { number: 8, answers: ['200'] },
              ],
            },
            {
              type: 'sentence_completion',
              wordLimit: { maxWords: 2, allowNumber: false },
              questions: [
                { number: 9, sentence: 'The first fully automated bottle machine was built in the {{9}}.', answers: ['USA', 'US', 'United States'] },
                { number: 10, sentence: 'Glass can be recycled without any loss of {{10}}.', answers: ['quality'] },
              ],
            },
            {
              type: 'diagram_label_completion',
              title: 'A Roman glass furnace',
              image: 'furnace',
              wordLimit: { maxWords: 2, allowNumber: false },
              labels: [
                { number: 11, x: 80, y: 30, answers: ['molten glass'] },
                { number: 12, x: 82, y: 82, answers: ['chamber'] },
                { number: 13, x: 6, y: 63, answers: ['furnace', 'furnace walls'] },
              ],
            },
          ],
        },
        {
          sectionNumber: 2,
          texts: [
            {
              title: 'Bees in the City',
              subtitle: 'Urban beekeeping is booming. But is it good for bees?',
              paragraphs: [
                { label: 'A', text: 'Twenty years ago, a beehive on a city roof would have been a curiosity. Today, rooftop hives can be found on hotels, banks and office blocks in most large European and North American cities. London alone is estimated to have more than 7,000 hives, a number that has more than doubled in a decade. Companies install hives as a symbol of their environmental commitment, and many employees enjoy the honey produced on site.' },
                { label: 'B', text: 'The boom began partly as a response to alarming reports about the decline of bees in the countryside. Intensive farming had removed hedgerows and wild flowers, and the use of certain pesticides was linked to the loss of whole colonies. City dwellers, who often felt powerless to help, saw keeping bees as a practical way to support a creature that pollinates around a third of the food we eat.' },
                { label: 'C', text: 'Cities can, in fact, be surprisingly good places for bees. Parks, gardens, railway embankments and cemeteries contain a wide variety of plants which flower at different times of the year. Temperatures in city centres are a few degrees higher than in the surrounding countryside, so the flowering season starts earlier and lasts longer. Pesticide use in private gardens has also fallen in many countries.' },
                { label: 'D', text: 'However, scientists have begun to question whether more hives are always better. A study by researchers at a London university counted the flowers available within a kilometre of each hive and compared this with the number of colonies. In the most crowded areas, there were simply not enough flowers to go round, and honeybees were found to be competing with wild bees, many of which are far rarer.' },
                { label: 'E', text: 'Wild bees, such as bumblebees and solitary mining bees, are less able to cope with competition. Unlike honeybees, they cannot fly long distances to find food, and they produce small numbers of young. Some ecologists now argue that the money spent on new hives would be better spent on planting flowers and creating nesting sites for wild species.' },
                { label: 'F', text: 'Diseases are another concern. When colonies are kept close together, parasites such as the varroa mite can spread quickly from one hive to the next. Inexperienced beekeepers may not notice the early signs of infection, and a single neglected hive can become a source of disease for a whole neighbourhood.' },
                { label: 'G', text: 'None of this means that urban beekeeping should stop. Most experts recommend instead that new beekeepers take a training course, that hive numbers are planned at city level, and that every new hive is matched by new planting. Managed in this way, they say, cities could become a refuge for honeybees and wild bees alike.' },
              ],
            },
          ],
          questionGroups: [
            {
              type: 'matching_headings',
              title: 'List of Headings',
              headings: [
                { key: 'i', text: 'Why city conditions can suit bees' },
                { key: 'ii', text: 'The risk of illness spreading' },
                { key: 'iii', text: 'A fashion among businesses' },
                { key: 'iv', text: 'Too many hives for the available food' },
                { key: 'v', text: 'The commercial value of city honey' },
                { key: 'vi', text: 'A way forward' },
                { key: 'vii', text: 'Problems in the countryside as a motive' },
                { key: 'viii', text: 'Native species at a disadvantage' },
              ],
              example: 'Paragraph A: iii',
              questions: [
                { number: 14, paragraph: 'B', answer: 'vii' },
                { number: 15, paragraph: 'C', answer: 'i' },
                { number: 16, paragraph: 'D', answer: 'iv' },
                { number: 17, paragraph: 'E', answer: 'viii' },
                { number: 18, paragraph: 'F', answer: 'ii' },
                { number: 19, paragraph: 'G', answer: 'vi' },
              ],
            },
            {
              type: 'matching_information',
              questions: [
                { number: 20, statement: 'a reference to the proportion of our food that depends on bees', answer: 'B' },
                { number: 21, statement: 'an explanation of why flowers bloom for longer in cities', answer: 'C' },
                { number: 22, statement: 'a figure showing how quickly hive numbers have grown', answer: 'A' },
              ],
            },
            {
              type: 'completion',
              variant: 'summary',
              answerMode: 'select',
              title: 'Wild bees and honeybees',
              options: [
                { key: 'A', text: 'distances' },
                { key: 'B', text: 'flowers' },
                { key: 'C', text: 'training' },
                { key: 'D', text: 'young' },
                { key: 'E', text: 'honey' },
                { key: 'F', text: 'parasites' },
                { key: 'G', text: 'pesticides' },
              ],
              lines: [
                {
                  text: 'Wild bees cannot travel long {{23}} to feed and have few {{24}}. Instead of buying hives, some ecologists would plant more {{25}}. Experts also say that new beekeepers should complete {{26}}.',
                },
              ],
              gaps: [
                { number: 23, answer: 'A' },
                { number: 24, answer: 'D' },
                { number: 25, answer: 'B' },
                { number: 26, answer: 'C' },
              ],
            },
          ],
        },
        {
          sectionNumber: 3,
          texts: [
            {
              title: 'Can Computers Be Creative?',
              paragraphs: [
                { text: 'For most of the twentieth century, creativity was regarded as the one ability that would always separate human beings from machines. Computers could calculate, sort and search far faster than any person, but writing a poem or composing a symphony seemed to require something that could not be reduced to rules. That assumption has been seriously challenged in recent years by software that produces paintings, music and stories which many people find impossible to distinguish from human work.' },
                { text: 'The philosopher Margaret Hale argues that we should judge creative output by its results rather than its origins. If a piece of music moves its listeners, she says, it makes little difference whether it was written by a composer or generated by a program. In her view, the insistence that real creativity requires consciousness is a prejudice rather than an argument.' },
                { text: 'Others are less convinced. The composer David Ortiz points out that today’s systems learn by analysing millions of existing works, and he describes them as extremely sophisticated forms of imitation. A human artist, he argues, creates out of personal experience and intends to communicate something; a program has neither experiences nor intentions. Ortiz accepts that the results can be impressive, but he believes that audiences will eventually lose interest in art that has nobody behind it.' },
                { text: 'The psychologist Anna Kowalski takes a middle position. Her research into how people respond to art suggests that knowing who made a work strongly influences how much they value it. In one experiment, volunteers rated identical paintings lower when they were told that a computer had produced them. Kowalski concludes that the question is not only what machines can do, but also what audiences are prepared to accept.' },
                { text: 'In my own view, the debate often overlooks the most common use of these tools: collaboration. Many designers, writers and musicians already use software to produce rough ideas which they then select, combine and develop. In such cases, the machine is less an independent artist than a new kind of instrument, and the creativity lies in the way people use it. It is likely that future generations will regard this partnership as entirely normal, just as photographers came to be accepted as artists after early critics dismissed the camera as a mere machine.' },
                { text: 'What seems certain is that the arrival of creative software will change the economics of the arts. Work that once took days, such as producing background music for advertisements, can now be done in minutes, and some professionals will lose income as a result. Yet new jobs are also appearing, from people who specialise in directing these systems to those who check their output for errors. Whether the overall effect on artists will be positive is, at present, impossible to predict.' },
              ],
            },
          ],
          questionGroups: [
            {
              type: 'multiple_choice',
              questions: [
                {
                  number: 27,
                  stem: 'According to the first paragraph, creativity was traditionally seen as',
                  options: [
                    { key: 'A', text: 'a skill that could be learned by following rules.' },
                    { key: 'B', text: 'something only humans could possess.' },
                    { key: 'C', text: 'less important than the ability to calculate.' },
                    { key: 'D', text: 'a quality that machines would soon develop.' },
                  ],
                  answer: 'B',
                },
                {
                  number: 28,
                  stem: 'What does Margaret Hale believe?',
                  options: [
                    { key: 'A', text: 'Only conscious beings can be creative.' },
                    { key: 'B', text: 'Computer music rarely moves listeners.' },
                    { key: 'C', text: 'The effect of a work matters more than who made it.' },
                    { key: 'D', text: 'Composers should use programs more often.' },
                  ],
                  answer: 'C',
                },
                {
                  number: 29,
                  stem: 'In Kowalski’s experiment, volunteers',
                  options: [
                    { key: 'A', text: 'could not tell human and computer paintings apart.' },
                    { key: 'B', text: 'preferred paintings produced by computers.' },
                    { key: 'C', text: 'valued the same painting less if a computer made it.' },
                    { key: 'D', text: 'were asked to produce their own paintings.' },
                  ],
                  answer: 'C',
                },
              ],
            },
            {
              type: 'yes_no_not_given',
              questions: [
                { number: 30, statement: 'Discussions about creative software often ignore how artists actually use it.', answer: 'YES' },
                { number: 31, statement: 'Software will never be used as a musical instrument.', answer: 'NO' },
                { number: 32, statement: 'Early photographers earned more than painters.', answer: 'NOT_GIVEN' },
                { number: 33, statement: 'It is already clear that creative software will benefit artists financially.', answer: 'NO' },
              ],
            },
            {
              type: 'matching_features',
              optionsTitle: 'List of People',
              options: [
                { key: 'A', text: 'Margaret Hale' },
                { key: 'B', text: 'David Ortiz' },
                { key: 'C', text: 'Anna Kowalski' },
              ],
              allowReuse: true,
              questions: [
                { number: 34, statement: 'Audiences may stop caring about art that no person has made.', answer: 'B' },
                { number: 35, statement: 'Information about the artist affects our judgement of a work.', answer: 'C' },
                { number: 36, statement: 'Requiring consciousness for creativity is a form of bias.', answer: 'A' },
                { number: 37, statement: 'Current programs essentially copy what already exists.', answer: 'B' },
              ],
            },
            {
              type: 'matching_sentence_endings',
              endings: [
                { key: 'A', text: 'can now be completed very quickly.' },
                { key: 'B', text: 'were once dismissed as mere machines.' },
                { key: 'C', text: 'learn by studying huge numbers of existing works.' },
                { key: 'D', text: 'will always be better than human artists.' },
                { key: 'E', text: 'check software output for mistakes.' },
              ],
              questions: [
                { number: 38, sentenceStart: 'Today’s creative systems', answer: 'C' },
                { number: 39, sentenceStart: 'Tasks such as writing music for advertisements', answer: 'A' },
                { number: 40, sentenceStart: 'Some of the new jobs involve people who', answer: 'E' },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================== WRITING
    writing: {
      task1: {
        kind: 'academic_report',
        visualType: 'bar_chart',
        prompt: 'The chart below shows the number of commuters entering Northbridge city centre each day by car and by bicycle between 2000 and 2020.',
        image: 'commuter-chart',
      },
      task2: {
        essayType: 'discussion',
        prompt: 'Some people believe that university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology.',
        question: 'Discuss both these views and give your own opinion.',
      },
    },

    // =========================================================== SPEAKING
    speaking: {
      part1: {
        topics: [
          {
            topic: 'Your home town',
            questions: [
              { text: 'Where is your home town?' },
              { text: 'What do you like most about it?' },
              { text: 'Has it changed much since you were a child?' },
            ],
          },
          {
            topic: 'Reading',
            questions: [
              { text: 'Do you enjoy reading?' },
              { text: 'What kind of books did you read when you were younger?' },
              { text: 'Do you prefer paper books or e-books? Why?' },
            ],
          },
          {
            topic: 'Weather',
            questions: [
              { text: 'What kind of weather do you like best?' },
              { text: 'Does the weather affect your mood?' },
              { text: 'What do people in your country usually do on rainy days?' },
            ],
          },
        ],
      },
      part2: {
        topic: 'Describe a skill you learned that you think is useful.',
        bulletPoints: ['what the skill is', 'when and where you learned it', 'how you learned it'],
        finalPrompt: 'and explain why you think this skill is useful.',
        roundingOff: [{ text: 'Do you think you will learn any other skills in the near future?' }],
      },
      part3: {
        themes: [
          {
            theme: 'Learning skills',
            questions: [
              { text: 'Which skills do you think are most important for young people today?' },
              { text: 'Is it better to learn a skill from a teacher or from the internet?' },
              { text: 'Why do some people find it hard to learn new skills as they get older?' },
            ],
          },
          {
            theme: 'Skills and work',
            questions: [
              { text: 'Should employers pay for their staff to learn new skills?' },
              { text: 'How might technology change the skills that people need for work in the future?' },
            ],
          },
        ],
      },
    },
  };
}

module.exports = { makeSamplePackage };
if (require.main === module) process.stdout.write(JSON.stringify(makeSamplePackage(), null, 2));
