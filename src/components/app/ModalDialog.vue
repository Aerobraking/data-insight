
<template>
  <transition name="modal-fade">
    <div
      @keydown.capture.stop
      @keyup.capture.stop
      @keypress.capture.stop
      @mousedown.capture.stop
      @mousemove.capture.stop
      @mouseup.capture.stop
      @click="close"
      class="modal-backdrop"
    >
      <div
        class="modal"
        role="dialog"
        aria-labelledby="modalTitle"
        aria-describedby="modalDescription"
      >
        <header class="modal-header" id="modalTitle">
          <slot name="header"> This is the default tile! </slot>
          <button
            type="button"
            class="btn-close"
            @click="close"
            aria-label="Close modal"
          >
            Close
          </button>
        </header>

        <section class="modal-body" id="modalDescription">
          <slot name="body"> This is the default body! </slot>
        </section>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import Gradient from "./Gradient";

export default defineComponent({
  name: "ModalDialog",

  mounted() {},
  methods: {
    close() {
      this.$emit("close");
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 1);

.modal-backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(7px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100000;
}

.modal {
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  top: 50px;
  left: 100px;
  position: absolute;
  bottom: 50px;
  right: 350px;
  min-width: 400px;
}

.modal-header,
.modal-footer {
  display: flex;
  padding-bottom: 20px;
}

.modal-header {
  position: relative;
  color: white;
  font-size: 25px;
  justify-content: space-between;
}

.modal-footer {
  border-top: 1px solid #eeeeee;
  flex-direction: column;
}

.modal-body {
  position: relative;
  overflow-y: auto;
}

.btn-close {
  position: absolute;
  top: 0;
  right: 0;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: auto;
  vertical-align: baseline;
  font-weight: bold;
  color: white;
  background: transparent;

  &:hover {
    color: $color-Selection;
  }
}

.btn-green {
  color: white;
  background: #4aae9b;
  border: 1px solid #4aae9b;
  border-radius: 2px;
}

.modal-fade-enter,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0s ease;
}
</style>

 