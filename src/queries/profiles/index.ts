/**
 * Medicine system profile queries.
 *
 * This module provides query methods for profiles across all medicine systems:
 * - TCM (Traditional Chinese Medicine)
 * - Western Herbal Medicine
 * - Ayurveda
 * - Persian (Unani/Tibb)
 * - Mongolian
 */

import type { TCMProfile, WesternHerbalProfile, AyurvedaProfile, PersianProfile, MongolianProfile } from '../../types/profiles/base'
import type { HerbalPreparation } from '../../types/preparation'
import type { EntityLoader } from '../core/loader'
import { extractSlug } from '../core/loader'

/**
 * Profile query methods for all medicine systems.
 */
export class ProfileQueries {
  constructor(private loader: EntityLoader) {}

  // ===========================================================================
  // TCM Profiles
  // ===========================================================================

  /**
   * Get a TCM profile by slug.
   */
  getTCMProfile(slug: string): TCMProfile | null {
    return this.loader.load<TCMProfile>(`tcm/profile/${slug}`)
  }

  /**
   * Get TCM herbs commonly combined with a specific herb.
   */
  getCombinedHerbs(tcmSlug: string): TCMProfile[] {
    const profile = this.getTCMProfile(tcmSlug)
    if (!profile?.combinesWith) return []

    return profile.combinesWith
      .map(ref => this.getTCMProfile(extractSlug(ref['@id'])))
      .filter((p): p is TCMProfile => p !== null)
  }

  // ===========================================================================
  // Western Profiles
  // ===========================================================================

  /**
   * Get a Western herbal profile by slug.
   */
  getWesternProfile(slug: string): WesternHerbalProfile | null {
    return this.loader.load<WesternHerbalProfile>(`western/profile/${slug}`)
  }

  // ===========================================================================
  // Ayurveda Profiles
  // ===========================================================================

  /**
   * Get an Ayurveda profile by slug.
   */
  getAyurvedaProfile(slug: string): AyurvedaProfile | null {
    return this.loader.load<AyurvedaProfile>(`ayurveda/profile/${slug}`)
  }

  // ===========================================================================
  // Persian Profiles
  // ===========================================================================

  /**
   * Get a Persian (TPM) profile by slug.
   */
  getPersianProfile(slug: string): PersianProfile | null {
    return this.loader.load<PersianProfile>(`persian/profile/${slug}`)
  }

  // ===========================================================================
  // Mongolian Profiles
  // ===========================================================================

  /**
   * Get a Mongolian profile by slug.
   */
  getMongolianProfile(slug: string): MongolianProfile | null {
    return this.loader.load<MongolianProfile>(`mongolian/profile/${slug}`)
  }

  // ===========================================================================
  // Cross-System Queries
  // ===========================================================================

  /**
   * Get all system profiles for a preparation.
   */
  getAllProfilesForPreparation(prep: HerbalPreparation): {
    tcm?: TCMProfile
    western?: WesternHerbalProfile
    ayurveda?: AyurvedaProfile
    persian?: PersianProfile
    mongolian?: MongolianProfile
  } {
    return {
      tcm: prep.hasTCMProfile?.[0]
        ? this.getTCMProfile(extractSlug(prep.hasTCMProfile[0]['@id']))
        : undefined,
      western: prep.hasWesternProfile?.[0]
        ? this.getWesternProfile(extractSlug(prep.hasWesternProfile[0]['@id']))
        : undefined,
      ayurveda: prep.hasAyurvedaProfile?.[0]
        ? this.getAyurvedaProfile(extractSlug(prep.hasAyurvedaProfile[0]['@id']))
        : undefined,
      persian: prep.hasPersianProfile?.[0]
        ? this.getPersianProfile(extractSlug(prep.hasPersianProfile[0]['@id']))
        : undefined,
      mongolian: prep.hasMongolianProfile?.[0]
        ? this.getMongolianProfile(extractSlug(prep.hasMongolianProfile[0]['@id']))
        : undefined,
    }
  }
}
