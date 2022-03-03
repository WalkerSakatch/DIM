import { allItemsSelector, bucketsSelector, sortedStoresSelector } from 'app/inventory/selectors';
import { getCurrentStore, getStore } from 'app/inventory/stores-helpers';
import { LockableBucketHashes } from 'app/loadout-builder/types';
import { getItemsFromLoadoutItems } from 'app/loadout/loadout-item-conversion';
import { DimLoadoutItem, Loadout } from 'app/loadout/loadout-types';
import { manifestSelector } from 'app/manifest/selectors';
import { RootState } from 'app/store/types';
import { BucketHashes } from 'data/d2/generated-enums';
import _ from 'lodash';
import { useCallback } from 'react';
import { shallowEqual, useSelector } from 'react-redux';

/**
 * Returns two bits of information:
 *  - for each armor slot, a real DIM item that either corresponds to the
 *    equipped item from the loadout, or the currently equipped armor item if
 *    the loadout didn't have one in that bucket
 *  - a loadout item (a real DIM item plus some other info?) representing the
 *    selected subclass for the loadout
 */
// TODO: Why are these in the same selector? Why isn't it memoized?
export function useEquippedLoadoutArmorAndSubclass(
  loadout: Loadout,
  storeId: string | undefined
): { armor: DimLoadoutItem[]; subclass: DimLoadoutItem | undefined } {
  const loadoutItemSelector = useCallback(
    (state: RootState): { armor: DimLoadoutItem[]; subclass: DimLoadoutItem | undefined } => {
      const stores = sortedStoresSelector(state);
      const currentStore = getCurrentStore(stores)!;
      const storeToHydrateFrom = storeId
        ? getStore(stores, storeId)
        : currentStore.classType === loadout.classType
        ? currentStore
        : stores.find((store) => store.classType === loadout.classType);
      const currentlyEquippedArmor =
        storeToHydrateFrom?.items.filter((item) => item.equipped && item.bucket.inArmor) ?? [];
      const classType = storeToHydrateFrom?.classType ?? loadout.classType;
      const allItems = allItemsSelector(state);
      const defs = manifestSelector(state)!;
      const buckets = bucketsSelector(state)!;
      const modsByBucket = loadout.parameters?.modsByBucket;

      const [loadoutItems] = getItemsFromLoadoutItems(
        loadout.items.filter((i) => i.equip),
        defs,
        storeId,
        buckets,
        allItems,
        modsByBucket
      );

      const loadoutItemsByBucket = _.keyBy(
        loadoutItems.filter((i) => i.classType === classType),
        (i) => i.bucket.hash
      );

      const subclass = loadoutItemsByBucket[BucketHashes.Subclass];
      const armor = _.compact(
        LockableBucketHashes.map(
          (bucketHash) =>
            loadoutItemsByBucket[bucketHash] ??
            currentlyEquippedArmor.find((item) => item.bucket.hash === bucketHash)
        )
      );

      return { armor, subclass };
    },
    [loadout, storeId]
  );

  return useSelector(loadoutItemSelector, shallowEqual);
}
