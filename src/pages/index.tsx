import React, { Component } from 'react';
import { Container, Header, Table, Rating, Icon } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';

type IndexPageProps = {};

type IndexPageState = {
	botcrew: any[];
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew' },
	{ width: 1, column: 'max_rarity', title: 'Rarity' },
	{ width: 1, column: 'command_skill', title: 'Command' },
	{ width: 1, column: 'science_skill', title: 'Science' },
	{ width: 1, column: 'security_skill', title: 'Security' },
	{ width: 1, column: 'engineering_skill', title: 'Engineering' },
	{ width: 1, column: 'diplomacy_skill', title: 'Diplomacy' },
	{ width: 1, column: 'medicine_skill', title: 'Medicine' }
];

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	state = { botcrew: [] };

	async componentDidMount() {
		let response = await fetch('/structured/botcrew.json');
		const botcrew = await response.json();

		// Add dummy fields for sorting to work
		botcrew.forEach(crew => {
			CONFIG.SKILLS_SHORT.forEach(skill => {
				crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
			});
		});

		this.setState({ botcrew });
	}

	_filterCrew(crew: any, filter: any): boolean {
		const matchesFilter = (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let matches = true;

		if (filter.conditionArray.length === 0) {
			// text search only
			for (let segment of filter.textSegments) {
				let segmentResult =
					matchesFilter(crew.name, segment.text) ||
					crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
					crew.traits_hidden.some(t => matchesFilter(t, segment.text));
				matches = matches && (segment.negated ? !segmentResult : segmentResult);
			}
		} else {
			let rarities = [];
			for (let condition of filter.conditionArray) {
				let conditionResult = true;
				if (condition.keyword === 'name') {
					conditionResult = matchesFilter(crew.name, condition.value);
				} else if (condition.keyword === 'trait') {
					conditionResult =
						crew.traits_named.some(t => matchesFilter(t, condition.value)) ||
						crew.traits_hidden.some(t => matchesFilter(t, condition.value));
				} else if (condition.keyword === 'rarity') {
					if (!condition.negated) {
						rarities.push(Number.parseInt(condition.value));
						continue;
					}

					conditionResult = crew.max_rarity === Number.parseInt(condition.value);
				}
				matches = matches && (condition.negated ? !conditionResult : conditionResult);
			}

			if (rarities.length > 0) {
				matches = matches && rarities.includes(crew.max_rarity);
			}

			for (let segment of filter.textSegments) {
				let segmentResult =
					matchesFilter(crew.name, segment.text) ||
					crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
					crew.traits_hidden.some(t => matchesFilter(t, segment.text));
				matches = matches && (segment.negated ? !segmentResult : segmentResult);
			}
		}

		return matches;
	}

	renderTableRow(crew: any): JSX.Element {
		return (
			<Table.Row key={crew.symbol} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`/media/assets/${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
						</div>
						<div style={{ gridArea: 'description' }}>
							Tier {crew.bigbook_tier}, {crew.events} events
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew.base_skills[skill.name].core}</b>
							<br />
							+({crew.base_skills[skill.name].range_min}-{crew.base_skills[skill.name].range_max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}

	render() {
		const { botcrew } = this.state;
		if (!botcrew || botcrew.length === 0) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Icon loading name='spinner' /> Loading...
					</Container>
				</Layout>
			);
		}

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as='h2'>Crew stats</Header>

					<SearchableTable
						data={botcrew}
						explanation={
							<div>
								<p>
									Do simple text search in the name and traits (with optional '-' for exclusion). For example, this will return all Rikers
									that are not romantic:
								</p>
								<p>
									<code>riker -romantic</code>
								</p>

								<p>
									You can also use advanced search to look through the <b>name</b>, <b>trait</b> or <b>rarity</b> fields. For example, this
									returns all crew with the 'Cultural Figure' trait of rarity 4 and 5 which are not alien and are from DS9:
								</p>
								<p>
									<code>trait:cultu rarity:4,5 -trait:nonhum ds9</code>
								</p>
								<p>Feedback is welcome!</p>
							</div>
						}
						renderTableRow={crew => this.renderTableRow(crew)}
						filterRow={(crew, filter) => this._filterCrew(crew, filter)}
						config={tableConfig}
					/>

					<p>
						<i>Hint</i> Click on a row to get details on that specific crew
					</p>
				</Container>
			</Layout>
		);
	}
}

export default IndexPage;
