<template>
  <q-list>
    <q-item class="text-h6">Tags</q-item>

    <q-item>
      <q-item-section>
        <q-input
          ref="newTagRef"
          v-model="newTag"
          label="Add new tag"
          :rules="[
            (val) =>
              meta.tagsValues.indexOf(val) === -1 || 'Tag already in use',
          ]"
          clearable
        />
      </q-item-section>
      <q-item-section side>
        <q-btn label="Add" @click="addTag" color="primary" />
      </q-item-section>
    </q-item>
    <q-item class="q-pt-none">
      <q-item-section top>
        <Auto-Complete
          v-model="existingTag"
          :options="meta.tagsValues"
          behavior="menu"
          label="Rename tag"
        />
      </q-item-section>
      <q-item-section top>
        <q-input
          v-model="changedTag"
          label="to tag"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn
          label="Rename"
          @click="rename('tags', existingTag, changedTag)"
          color="primary"
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section> Remove unused tags</q-item-section>
      <q-item-section side>
        <q-btn label="Remove" @click="removeTags" color="primary" />
      </q-item-section>
    </q-item>
  </q-list>

  <q-scroll-area class="gt-xs" style="height: 50vh">
    <div class="q-pa-md text-subtitle1">
      <router-link
        v-for="(count, value) in meta.tagsWithCount"
        :key="value"
        :title="`${value}: ${count}`"
        :to="{ path: '/list', query: { tags: value } }"
        class="q-pr-sm link"
        >{{ value }},</router-link
      >
    </div>
  </q-scroll-area>
</template>

<script setup>
import { computed, ref } from "vue";
import { useValuesStore } from "../stores/values";
import AutoComplete from "../components/Auto-Complete.vue";
import { rename } from "../helpers/common";
import notify from "../helpers/notify";

const meta = useValuesStore();

const values = computed(() => meta.values);
const newTagRef = ref(null),
  newTag = ref(""),
  existingTag = ref(""),
  changedTag = ref("");

const addTag = () => {
  if (newTag.value !== "" && meta.tagsValues.indexOf(newTag.value) === -1) {
    values.value.tags[newTag.value] = 0;
    newTag.value = "";
  }
  newTagRef.value.resetValidation();
};
const removeTags = () => {
  meta.removeUnusedTags();
  notify({
    message: `Successfully removed unused tags`,
  });
};
</script>
