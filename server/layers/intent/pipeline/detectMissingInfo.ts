// Step 8: Missing critical info detection

import type { PrimaryIntent, ExtractedEntities } from '../types';
import { ENTITY_REQUIREMENTS, RECOMMENDED_ENTITIES } from '../rules/scoring';

export interface MissingInfoResult {
  critical: string[];
  recommended: string[];
  needsClarification: boolean;
}

export function detectMissingInfo(
  intent: PrimaryIntent, 
  entities: ExtractedEntities
): MissingInfoResult {
  const critical: string[] = [];
  const recommended: string[] = [];
  
  const required = ENTITY_REQUIREMENTS[intent] || [];
  const suggestions = RECOMMENDED_ENTITIES[intent] || [];
  
  for (const field of required) {
    if (!hasEntity(entities, field)) {
      critical.push(field);
    }
  }
  
  for (const field of suggestions) {
    if (!hasEntity(entities, field) && !critical.includes(field)) {
      recommended.push(field);
    }
  }
  
  const needsClarification = critical.length > 0;
  
  return { critical, recommended, needsClarification };
}

function hasEntity(entities: ExtractedEntities, field: string): boolean {
  switch (field) {
    case 'time':
      return entities.time.confidence > 0;
    case 'date':
      return entities.date.confidence > 0;
    case 'duration':
      return entities.duration.confidence > 0;
    case 'people':
      return entities.people.normalized.length > 0;
    case 'location':
      return entities.location.confidence > 0;
    case 'taskName':
      return entities.taskName.confidence > 0;
    case 'urgency':
      return entities.urgency.confidence > 0;
    default:
      return false;
  }
}
