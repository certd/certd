<template>
  <div class="d-container">
    <div class="box">
      <div class="inner">
        <div class="header">
          <slot name="header"></slot>
        </div>
        <div class="body">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'd-container'
}
</script>

<style lang="less">
.d-container{
  height: 100%;
  width: 100%;
  position: relative;
  .box {
    height: 100%;
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
    .inner{
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      .header{
        flex-shrink: 0;
      }
      .body{
        overflow-y: auto;
        flex:1
      }
      .footer{
        flex-shrink: 0;
      }
    }

  }
}

</style>
