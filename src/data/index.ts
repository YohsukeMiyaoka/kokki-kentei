import type { Country, Grade, Question } from '../types';
import countriesJson from './countries.json';
import q1 from './questions-1kyu.json';
import q2 from './questions-2kyu.json';

export const countries = countriesJson as Country[];
export const countryById = new Map(countries.map((c) => [c.id, c]));

export const questionPools: Record<Grade, Question[]> = {
  1: q1 as Question[],
  2: q2 as Question[],
};

export const questionById = new Map([...questionPools[1], ...questionPools[2]].map((q) => [q.id, q]));
